# spark_insights_job.py
# Offline Spark Job: Ingests all CSVs from HDFS and saves processed insights as local Parquet.
# Writes output to local disk so the FastAPI backend can always read it.


from pyspark.sql import SparkSession
from pyspark.sql.functions import col, avg, count, desc, lit, trim, when, regexp_extract
from functools import reduce
import os


# ─── Paths ────────────────────────────────────────────────────────────────────
# Read CSVs from HDFS data lake; write processed Parquet locally for the API
HDFS_BASE  = "hdfs:///user/datalake/tourism"
# Local output directory (relative to this script's location)
_HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL_OUT  = os.path.join(_HERE, "processed_insights")
os.makedirs(LOCAL_OUT, exist_ok=True)

# ─── Fallback: read direct from local CSV if HDFS is unreachable ─────────────
LOCAL_CSV_BASE = os.path.join(_HERE, "tourism_datasets")


def main():
    spark = SparkSession.builder \
        .appName("TravelBuddy-InsightsProcessor") \
        .master("local[*]") \
        .config("spark.sql.shuffle.partitions", "4") \
        .config("spark.ui.showConsoleProgress", "false") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("ERROR")
    print("=" * 60)
    print("Starting Spark Insight Processing Job...")
    print(f"  Output → {LOCAL_OUT}")
    print("=" * 60)

    # Helper: read CSV using HDFS path, fall back to local path
    def read_csv(hdfs_glob, local_rel):
        try:
            df = spark.read \
                .option("header", "true").option("inferSchema", "true") \
                .csv(f"{HDFS_BASE}/{hdfs_glob}")
            # Trigger lazy action to verify the path
            _ = df.columns
            return df, "HDFS"
        except Exception:
            local_path = os.path.join(LOCAL_CSV_BASE, local_rel).replace("\\", "/")
            df = spark.read \
                .option("header", "true").option("inferSchema", "true") \
                .csv(f"file:///{local_path}")
            return df, "local"

    # ──────────────────────────────────────────────────────────────────────────
    # 1. ATTRACTIONS  →  poi_stats
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[1/8] Processing Attractions...")
    attractions_df = None
    try:
        attractions_df, src = read_csv("attractions/*.csv", "attractions")
        city_col = next(
            (c for c in attractions_df.columns if c.lower() in ['city', 'city_name', 'location']),
            None
        )
        if city_col:
            poi_insights = attractions_df \
                .filter(col(city_col).isNotNull()) \
                .groupBy(trim(col(city_col)).alias("city")) \
                .agg(count("*").alias("poi_count")) \
                .orderBy(desc("poi_count"))
        else:
            poi_insights = attractions_df \
                .agg(count("*").alias("poi_count")) \
                .withColumn("city", lit("Jaipur"))

        out = os.path.join(LOCAL_OUT, "poi_stats").replace("\\", "/")
        poi_insights.write.mode("overwrite").parquet(f"file:///{out}")
        print(f"    POI stats saved  ({poi_insights.count()} cities) [source={src}]")
    except Exception as e:
        print(f"    Error processing attractions: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # 2. HOTELS (multi-source, normalised to city + rating)  →  hotel_stats
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[2/8] Processing Hotels (Multi-Source)...")
    hotel_frames = []

    # ── Source 1: jaipur_hotels.csv ──────────────────────────────────────────
    try:
        jdf, src = read_csv("hotels/jaipur_hotels.csv", "hotels/jaipur_hotels.csv")
        lc = [c.lower() for c in jdf.columns]
        city_c = next((jdf.columns[i] for i, c in enumerate(lc) if c in ['city', 'location']), None)
        rate_c = next((jdf.columns[i] for i, c in enumerate(lc)
                       if c in ['rating', 'hotel_rating', 'stars']), None)
        if city_c and rate_c:
            f = jdf.select(
                trim(col(city_c)).alias("city"),
                col(rate_c).cast("double").alias("rating")
            ).filter(col("city").isNotNull() & col("rating").isNotNull() & (col("rating") > 0))
            hotel_frames.append(f)
            print(f"    jaipur_hotels        : {f.count()} records  [source={src}]")
    except Exception as e:
        print(f"    jaipur_hotels error  : {e}")

    # ── Source 2: OYO_HOTEL_ROOMS.csv ────────────────────────────────────────
    # Schema: Hotel_name, Location ("area, City"), Price, Discount, Rating(review cnt)
    # City = last comma-separated token in Location
    # Rating proxy = price bucket (not a 0-5 scale in original)
    try:
        oyo, src = read_csv("hotels/OYO_HOTEL_ROOMS.csv", "hotels/OYO_HOTEL_ROOMS (1).csv")
        lc = [c.lower() for c in oyo.columns]
        loc_c   = next((oyo.columns[i] for i, c in enumerate(lc) if c == 'location'), None)
        price_c = next((oyo.columns[i] for i, c in enumerate(lc) if c == 'price'), None)
        if loc_c and price_c:
            f = oyo \
                .withColumn("city", trim(regexp_extract(col(loc_c), r",\s*([^,]+)$", 1))) \
                .withColumn("rating",
                    when(col(price_c).cast("double") <= 1500, lit(3.5))
                   .when(col(price_c).cast("double") <= 2500, lit(4.0))
                   .when(col(price_c).cast("double") <= 4000, lit(4.3))
                   .otherwise(lit(4.6))
                ).select("city", "rating") \
                 .filter(col("city").isNotNull() & (trim(col("city")) != ""))
            hotel_frames.append(f)
            print(f"    OYO_HOTEL_ROOMS      : {f.count()} records  [source={src}]")
    except Exception as e:
        print(f"    OYO_HOTEL_ROOMS error: {e}")

    # ── Source 3: google_hotel_data_clean_v2.csv ─────────────────────────────
    # Schema: Hotel_Name, Hotel_Rating (0-5 float), City, Feature_1..9, Hotel_Price
    try:
        gdf, src = read_csv(
            "hotels/google_hotel_data_clean_v2.csv",
            "hotels/google_hotel_data_clean_v2.csv"
        )
        lc = [c.lower() for c in gdf.columns]
        city_c = next((gdf.columns[i] for i, c in enumerate(lc) if c == 'city'), None)
        rate_c = next((gdf.columns[i] for i, c in enumerate(lc)
                       if c in ['hotel_rating', 'rating', 'stars']), None)
        if city_c and rate_c:
            f = gdf.select(
                trim(col(city_c)).alias("city"),
                col(rate_c).cast("double").alias("rating")
            ).filter(
                col("city").isNotNull() &
                col("rating").isNotNull() &
                (col("rating") > 0) &
                (col("rating") <= 5)
            )
            hotel_frames.append(f)
            print(f"    Google hotel data    : {f.count()} records  [source={src}]")
    except Exception as e:
        print(f"    Google hotel error   : {e}")

    # ── Source 4: goibibo_com-travel_sample.csv ──────────────────────────────
    # Schema includes: city (or hotel_city), site_review_rating
    try:
        goi, src = read_csv(
            "hotels/goibibo_com-travel_sample.csv",
            "hotels/goibibo_com-travel_sample.csv"
        )
        lc = [c.lower() for c in goi.columns]
        city_c = next((goi.columns[i] for i, c in enumerate(lc)
                       if c in ['city', 'hotel_city']), None)
        rate_c = next((goi.columns[i] for i, c in enumerate(lc)
                       if 'rating' in c.lower() or 'review' in c.lower()), None)
        if city_c and rate_c:
            f = goi.select(
                trim(col(city_c)).alias("city"),
                col(rate_c).cast("double").alias("rating")
            ).filter(
                col("city").isNotNull() &
                col("rating").isNotNull() &
                (col("rating") > 0) &
                (col("rating") <= 5)
            )
            hotel_frames.append(f)
            print(f"    Goibibo              : {f.count()} records  [source={src}]")
        else:
            print(f"    Goibibo: available columns = {goi.columns[:12]}")
    except Exception as e:
        print(f"    Goibibo error        : {e}")

    # ── Merge & Aggregate ─────────────────────────────────────────────────────
    if hotel_frames:
        try:
            all_hotels = reduce(lambda a, b: a.union(b), hotel_frames)
            hotel_insights = all_hotels \
                .groupBy("city") \
                .agg(
                    avg("rating").alias("avg_rating"),
                    count("*").alias("hotel_count")
                ) \
                .filter(col("city").isNotNull() & (trim(col("city")) != "")) \
                .orderBy(desc("avg_rating")) \
                .limit(50)

            out = os.path.join(LOCAL_OUT, "hotel_stats").replace("\\", "/")
            hotel_insights.write.mode("overwrite").parquet(f"file:///{out}")
            n = hotel_insights.count()
            print(f"\n    Hotel stats saved — {n} cities from {len(hotel_frames)} source(s)")
            hotel_insights.show(15, truncate=False)
        except Exception as e:
            print(f"    Hotel merge/write error: {e}")
    else:
        print("    No hotel DataFrames produced — check CSV paths and column names.")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. TRENDS  →  trends
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[3/8] Processing Trends...")
    try:
        if attractions_df is None:
            attractions_df, _ = read_csv("attractions/*.csv", "attractions")
        type_col = next(
            (c for c in attractions_df.columns if c.lower() in ['type', 'category', 'poi_type']),
            None
        )
        if type_col:
            trend_insights = attractions_df \
                .filter(col(type_col).isNotNull()) \
                .groupBy(col(type_col).alias("category")) \
                .agg(count("*").alias("count")) \
                .orderBy(desc("count"))

            out = os.path.join(LOCAL_OUT, "trends").replace("\\", "/")
            trend_insights.write.mode("overwrite").parquet(f"file:///{out}")
            print(f"    Trends saved — {trend_insights.count()} categories")
        else:
            print("    No type/category column found in attractions data")
    except Exception as e:
        print(f"    Error processing trends: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # 4. PLACES  →  places_stats
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[4/8] Processing Places...")
    try:
        places_df, src = read_csv("places/*.csv", "places")
        city_col = next((c for c in places_df.columns if c.lower() == 'city'), None)
        rate_col = next((c for c in places_df.columns if 'rating' in c.lower() or 'ratings' in c.lower()), None)
        if city_col and rate_col:
            places_stats = places_df \
                .filter(col(city_col).isNotNull() & col(rate_col).isNotNull()) \
                .groupBy(trim(col(city_col)).alias("city")) \
                .agg(
                    count("*").alias("places_count"),
                    avg(col(rate_col).cast("double")).alias("avg_place_rating")
                ) \
                .orderBy(desc("places_count"))
            out = os.path.join(LOCAL_OUT, "places_stats").replace("\\", "/")
            places_stats.write.mode("overwrite").parquet(f"file:///{out}")
            print(f"    Places stats saved ({places_stats.count()} cities) [source={src}]")
        else:
            print("    Required columns missing in places data.")
    except Exception as e:
        print(f"    Error processing places: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # 5. CITIES  →  cities_stats
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[5/8] Processing Cities...")
    try:
        cities_df, src = read_csv("cities/*.csv", "cities")
        city_col = next((c for c in cities_df.columns if c.lower() == 'city'), None)
        rate_col = next((c for c in cities_df.columns if 'rating' in c.lower() or 'ratings' in c.lower()), None)
        if city_col:
            cities_stats = cities_df.filter(col(city_col).isNotNull())
            if rate_col:
                cities_stats = cities_stats \
                    .groupBy(trim(col(city_col)).alias("city")) \
                    .agg(avg(col(rate_col).cast("double")).alias("city_rating"))
            else:
                cities_stats = cities_stats.select(trim(col(city_col)).alias("city"))
            out = os.path.join(LOCAL_OUT, "cities_stats").replace("\\", "/")
            cities_stats.write.mode("overwrite").parquet(f"file:///{out}")
            print(f"    Cities stats saved ({cities_stats.count()} cities) [source={src}]")
    except Exception as e:
        print(f"    Error processing cities: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # 6. DESTINATIONS  →  destinations_stats
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[6/8] Processing Destinations...")
    try:
        dest_df, src = read_csv("destinations/*.csv", "destinations")
        state_col = next((c for c in dest_df.columns if c.lower() == 'state'), None)
        if state_col:
            dest_stats = dest_df \
                .filter(col(state_col).isNotNull()) \
                .groupBy(trim(col(state_col)).alias("state")) \
                .agg(count("*").alias("destinations_count")) \
                .orderBy(desc("destinations_count"))
            out = os.path.join(LOCAL_OUT, "destinations_stats").replace("\\", "/")
            dest_stats.write.mode("overwrite").parquet(f"file:///{out}")
            print(f"    Destinations stats saved ({dest_stats.count()} states) [source={src}]")
        else:
            print("    State column not found in destinations data.")
    except Exception as e:
        print(f"    Error processing destinations: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # 7. FOOD  →  food_stats
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[7/8] Processing Food...")
    try:
        food_df, src = read_csv("food/*.csv", "food")
        diet_col = next((c for c in food_df.columns if c.lower() == 'diet_type' or c.lower() == 'diet'), None)
        if diet_col:
            food_stats = food_df \
                .filter(col(diet_col).isNotNull()) \
                .groupBy(trim(col(diet_col)).alias("diet_type")) \
                .agg(count("*").alias("dish_count")) \
                .orderBy(desc("dish_count"))
            out = os.path.join(LOCAL_OUT, "food_stats").replace("\\", "/")
            food_stats.write.mode("overwrite").parquet(f"file:///{out}")
            print(f"    Food stats saved ({food_stats.count()} diet types) [source={src}]")
        else:
            print("    Diet column not found in food data.")
    except Exception as e:
        print(f"    Error processing food: {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # 8. TRAVEL AGENCIES  →  agency_stats
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[8/8] Processing Travel Agencies...")
    try:
        agency_df, src = read_csv("travel_agencies/*.csv", "travel_agencies")
        state_col = next((c for c in agency_df.columns if c.lower() == 'state'), None)
        if state_col:
            agency_stats = agency_df \
                .filter(col(state_col).isNotNull()) \
                .groupBy(trim(col(state_col)).alias("state")) \
                .agg(count("*").alias("agency_count")) \
                .orderBy(desc("agency_count"))
            out = os.path.join(LOCAL_OUT, "agency_stats").replace("\\", "/")
            agency_stats.write.mode("overwrite").parquet(f"file:///{out}")
            print(f"    Agency stats saved ({agency_stats.count()} states) [source={src}]")
        else:
            print("    State column not found in agency data.")
    except Exception as e:
        print(f"    Error processing agencies: {e}")

    spark.stop()
    print("\n" + "=" * 60)
    print("Spark Job Completed Successfully.")
    print(f"Parquet files written to: {LOCAL_OUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()
