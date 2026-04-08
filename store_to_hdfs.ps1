# store_to_hdfs.ps1
# This script uploads all CSV files from local tourism_datasets to HDFS Data Lake.

$localBase = "C:\Users\Lenovo\OneDrive\Desktop\travel-buddy-updated\tourism_datasets"
$hdfsBase = "/user/datalake/tourism"

function Upload-Files {
    param (
        [string]$currentLocalDir,
        [string]$currentHdfsDir
    )

    # Ensure HDFS directory exists
    hadoop fs -mkdir -p $currentHdfsDir

    # Get all CSV files in current local directory
    $csvFiles = Get-ChildItem -Path $currentLocalDir -Filter *.csv

    foreach ($file in $csvFiles) {
        $hdfsPath = "$currentHdfsDir/$($file.Name)"
        Write-Host "Uploading $($file.FullName) to $hdfsPath..."
        hadoop fs -put -f $file.FullName $hdfsPath
    }

    # Recurse into subdirectories
    $subDirs = Get-ChildItem -Path $currentLocalDir -Directory
    foreach ($dir in $subDirs) {
        $nextLocal = $dir.FullName
        $nextHdfs = "$currentHdfsDir/$($dir.Name)"
        Upload-Files -currentLocalDir $nextLocal -currentHdfsDir $nextHdfs
    }
}

# Start the upload process
Upload-Files -currentLocalDir $localBase -currentHdfsDir $hdfsBase

Write-Host "Data lake upload completed."
