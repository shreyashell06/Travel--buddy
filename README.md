# 🧳 Travel Buddy

**A Scalable, Data-Driven AI Tourism Recommendation System for India**  
*Built with a Robust 6-Layer Big Data Architecture*

---

## 📌 Overview

**Travel Buddy** is an intelligent tourism platform that leverages **Big Data** and **AI** to deliver personalized travel recommendations across India. The system processes large-scale tourism datasets using a **6-Layer Big Data Architecture** to generate actionable insights on tourist behavior, seasonal trends, and destination popularity.

Designed for scalability and performance, it combines distributed data processing with modern web technologies to provide a seamless user experience.

---

## ✨ Key Features

- **AI-Powered Personalized Recommendations** based on user preferences and historical patterns
- **Real-time Tourism Analytics** powered by Apache Spark
- **Scalable 6-Layer Architecture** for efficient data handling
- **Interactive Dashboard** with rich visualizations
- **Smart Itinerary Generator**
- **Tourist Footfall Prediction & Seasonal Insights**
- **Responsive Web Interface** with excellent UX

---

## 🏗️ System Architecture

The project implements a **well-defined 6-Layer Big Data Architecture**:

1. **Data Ingestion Layer** — Collection from multiple sources
2. **Data Storage Layer** — HDFS + Structured storage
3. **Data Processing Layer** — Apache Spark (PySpark)
4. **Analytics & Insights Layer** — Statistical analysis and aggregation
5. **AI/ML Layer** — Recommendation engine & predictive modeling
6. **Presentation Layer** — React frontend + Python backend API

---

## 🛠️ Tech Stack

| Category              | Technologies                                      |
|-----------------------|---------------------------------------------------|
| **Frontend**          | React.js, HTML5, CSS3, JavaScript, Tailwind CSS   |
| **Backend**           | Python, FastAPI / Flask                           |
| **Big Data**          | Apache Spark, PySpark, HDFS                       |
| **Data Processing**   | Pandas, NumPy, Spark SQL                          |

---
## 📁 Project Structure

```bash
Travel--buddy/
├── backend/                    # FastAPI / Flask application
├── frontend/                   # React.js frontend
├── tourism_datasets/           # Raw tourism data
├── processed_insights/         # Spark job outputs
├── spark_insights_job.py       # Main PySpark processing job
├── annotate.py                 # Data annotation script
├── store_to_hdfs.ps1           # HDFS upload script
├── Travel_Buddy report final_.docx
└── README.md
```

---
## 🚀 How to Run the Project (Step-by-Step)

### 1. Clone the Repository
```bash
git clone https://github.com/shreyashell06/Travel--buddy.git
cd Travel--buddy
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # For Windows
# source venv/bin/activate     # For Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Run Spark Job
```bash
spark-submit spark_insights_job.py
```

## 📝 Important Notes
- **Make sure Python 3.9+, Node.js, and Apache Spark are installed.**
- **Create a .env file in the backend folder if your project uses API keys.**
- **Backend runs on http://localhost:8000**
- **Frontend runs on http://localhost:3000**




