import asyncio
import subprocess
import shutil
import os
import time
import concurrent.futures
from datetime import datetime
from fastapi import UploadFile, File
from typing import List, Dict, Any

class FileUploads:
    def __init__(self, raw_data_dir: str = "./data/raw_data", 
                 public_data_dir: str = "./data/public_data", 
                 logs_dir: str = "./logs"):
        self.raw_data_dir = raw_data_dir
        self.public_data_dir = public_data_dir
        self.logs_dir = logs_dir
        
    def _create_directories(self):
        """Create necessary directories if they don't exist"""
        os.makedirs(self.raw_data_dir, exist_ok=True)
        os.makedirs(self.public_data_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)
    
    async def _save_files(self, files: List[UploadFile]) -> List[Dict[str, str]]:
        """Save uploaded files to raw_data directory"""
        print("INFO: Starting file save process")
        results = []
        for file in files:
            print(f"INFO: Processing file {file.filename}")
            contents = await file.read()
            file_path = os.path.join(self.raw_data_dir, file.filename)
            
            # Create directory structure if it doesn't exist
            file_dir = os.path.dirname(file_path)
            os.makedirs(file_dir, exist_ok=True)
            print(f"INFO: Created directory structure for {file_path}")
            
            with open(file_path, "wb") as f:
                f.write(contents)
            print(f"INFO: File saved to {file_path}")
            results.append({"filename": file.filename, "saved_to": file_path})
        print("INFO: File save process completed")
        return results
    
    async def _run_ingest_process_and_move_files(self) -> List[Dict[str, str]]:
        """Run ingest.py in background and move files after success"""
        print("INFO: Starting ingest process and file move")
        results = []
        try:
            # Ensure logs directory exists
            print(f"INFO: Creating logs directory {self.logs_dir}")
            os.makedirs(self.logs_dir, exist_ok=True)
            
            # Generate timestamp for log file
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S%f")[:-3]
            log_file_path = os.path.join(self.logs_dir, f"{timestamp}.txt")
            print(f"INFO: Generated log file path {log_file_path}")
            
            # Start the background task
            print("INFO: Starting background ingest task")
            asyncio.create_task(self._background_ingest_and_move(log_file_path))
            
            results.append({"status": "ingest.py started in background", "log_file": log_file_path})
            
        except Exception as e:
            print(f"INFO: Failed to start ingest process - {str(e)}")
            results.append({"status": f"Failed to start ingest.py: {str(e)}"})
        
        print("INFO: Ingest process setup completed")
        return results
    
    async def _background_ingest_and_move(self, log_file_path: str):
        """Background task to run ingest.py and move files on success"""
        print(f"INFO: Background ingest task started with log file {log_file_path}")
        try:
            # Create log file immediately to confirm it's working
            print("INFO: Creating initial log file")
            with open(log_file_path, "w") as log_file:
                log_file.write(f"Starting ingest process at {datetime.now()}\n")
                log_file.write(f"Log file created at: {log_file_path}\n")
                log_file.flush()
            
            # Run ingest.py and wait for completion using subprocess.run
            print("INFO: Starting ingest.py subprocess")
            
            # Check if ingest.py exists first
            ingest_path = "./ingest.py"
            current_dir = os.getcwd()
            print(f"INFO: Current working directory: {current_dir}")
            print(f"INFO: Looking for ingest.py at: {os.path.abspath(ingest_path)}")
            
            if os.path.exists(ingest_path):
                print(f"INFO: Found ingest.py at {os.path.abspath(ingest_path)}")
            else:
                # Try looking in the api directory
                api_ingest_path = "./api/ingest.py"
                if os.path.exists(api_ingest_path):
                    print(f"INFO: Found ingest.py at {os.path.abspath(api_ingest_path)}")
                    ingest_path = api_ingest_path
                else:
                    print(f"INFO: ingest.py not found at {os.path.abspath(ingest_path)} or {os.path.abspath(api_ingest_path)}")
                    # List files in current directory for debugging
                    print(f"INFO: Files in current directory: {os.listdir('.')}")
                    with open(log_file_path, "a") as log_file:
                        log_file.write(f"\nERROR: ingest.py not found at {os.path.abspath(ingest_path)} or {os.path.abspath(api_ingest_path)}")
                        log_file.write(f"\nCurrent directory: {current_dir}")
                        log_file.write(f"\nFiles in current directory: {os.listdir('.')}")
                    return
            
            with open(log_file_path, "a") as log_file:
                log_file.write(f"\nStarting ingest.py execution at {datetime.now()}...")
                log_file.write(f"\nCurrent working directory: {os.getcwd()}")
                log_file.write(f"\nCommand: python ingest.py")
                log_file.flush()
                
                # Import and use the DocumentIngestor class directly
                try:
                    from ingest import DocumentIngestor
                    print("INFO: Using DocumentIngestor class directly")
                    ingestor = DocumentIngestor()
                    result_tuple = ingestor.run()
                    
                    if result_tuple:
                        chunks, docs = result_tuple
                        log_file.write(f"\nIngestion completed successfully: {chunks} chunks from {docs} documents")
                        result = type('Result', (), {'returncode': 0})()
                    else:
                        log_file.write(f"\nIngestion completed but no documents processed")
                        result = type('Result', (), {'returncode': 0})()
                        
                except Exception as ingest_error:
                    print(f"INFO: Direct ingestion failed, falling back to subprocess: {str(ingest_error)}")
                    log_file.write(f"\nDirect ingestion failed: {str(ingest_error)}")
                    log_file.write(f"\nFalling back to subprocess execution...")
                    
                    # Fallback to subprocess
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        print("INFO: Executing ingest.py subprocess")
                        result = await asyncio.get_event_loop().run_in_executor(
                            executor,
                            lambda: subprocess.run(
                                ["python", "ingest.py"],
                                stdout=log_file,
                                stderr=subprocess.STDOUT,
                                shell=True,
                                cwd=os.getcwd()
                            )
                        )
                        print(f"INFO: Subprocess completed with return code: {result.returncode}")
                
                # Add completion timestamp
                log_file.write(f"\nIngest.py execution completed at {datetime.now()}")
                log_file.flush()
            
            # Check if process succeeded
            print(f"INFO: Ingest.py completed with return code {result.returncode}")
            if result.returncode == 0:
                print("INFO: Ingest successful, moving files to public_data")
                # Move files to public_data on success
                await self._move_files_to_public_async(log_file_path)
            else:
                print(f"INFO: Ingest failed with return code {result.returncode}")
                # Log failure
                with open(log_file_path, "a") as log_file:
                    log_file.write(f"\nIngest process failed with return code: {result.returncode}")
                    log_file.write("\nFiles not moved to public_data due to ingest failure.")
                    
        except Exception as e:
            # Log the full exception details
            import traceback
            try:
                with open(log_file_path, "a") as log_file:
                    log_file.write(f"\nException during ingest process: {str(e)}")
                    log_file.write(f"\nException type: {type(e).__name__}")
                    log_file.write(f"\nFull traceback:\n{traceback.format_exc()}")
                    log_file.write("\nFiles not moved to public_data due to exception.")
            except Exception as log_error:
                # If we can't write to log file, at least print to console
                print(f"Failed to write to log file {log_file_path}: {log_error}")
                print(f"Original exception: {str(e)}")
                print(f"Full traceback:\n{traceback.format_exc()}")
    
    async def _move_files_to_public_async(self, log_file_path: str):
        """Move all files from raw_data to public_data and log the result"""
        print("INFO: Starting file move to public_data")
        try:
            for root, dirs, files in os.walk(self.raw_data_dir):
                for file in files:
                    src_path = os.path.join(root, file)
                    rel_path = os.path.relpath(src_path, self.raw_data_dir)
                    dest_path = os.path.join(self.public_data_dir, rel_path)
                    print(f"INFO: Moving file {src_path} to {dest_path}")
                    
                    # Create destination directory if it doesn't exist
                    dest_dir = os.path.dirname(dest_path)
                    os.makedirs(dest_dir, exist_ok=True)
                    
                    # Move file with retry mechanism for Windows file locks
                    await self._move_file_with_retry(src_path, dest_path)
            
            # Remove empty raw_data directory structure with retry
            print("INFO: Cleaning up raw_data directory")
            await self._remove_directory_with_retry(self.raw_data_dir)
            os.makedirs(self.raw_data_dir, exist_ok=True)
            
            # Log success
            print("INFO: Files moved to public_data successfully")
            with open(log_file_path, "a") as log_file:
                log_file.write("\nFiles moved to public_data successfully.")
                
        except Exception as e:
            print(f"INFO: Failed to move files to public_data - {str(e)}")
            # Log failure
            with open(log_file_path, "a") as log_file:
                log_file.write(f"\nFailed to move files to public_data: {str(e)}")
    
    async def _move_file_with_retry(self, src_path: str, dest_path: str, max_retries: int = 5, delay: float = 1.0):
        """Move file with retry mechanism for Windows file locks"""
        for attempt in range(max_retries):
            try:
                shutil.move(src_path, dest_path)
                print(f"INFO: Successfully moved {src_path} to {dest_path}")
                return
            except (OSError, PermissionError) as e:
                if attempt < max_retries - 1:
                    print(f"INFO: Attempt {attempt + 1} failed to move {src_path}: {str(e)}. Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    delay *= 1.5  # Exponential backoff
                else:
                    print(f"ERROR: Failed to move {src_path} after {max_retries} attempts: {str(e)}")
                    raise e
    
    async def _remove_directory_with_retry(self, dir_path: str, max_retries: int = 5, delay: float = 1.0):
        """Remove directory with retry mechanism for Windows file locks"""
        for attempt in range(max_retries):
            try:
                shutil.rmtree(dir_path)
                print(f"INFO: Successfully removed directory {dir_path}")
                return
            except (OSError, PermissionError) as e:
                if attempt < max_retries - 1:
                    print(f"INFO: Attempt {attempt + 1} failed to remove {dir_path}: {str(e)}. Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    delay *= 1.5  # Exponential backoff
                else:
                    print(f"ERROR: Failed to remove {dir_path} after {max_retries} attempts: {str(e)}")
                    raise e
    
    async def upload_files(self, files: List[UploadFile]) -> Dict[str, Any]:
        """Main method to handle file upload process"""
        print("INFO: Starting file upload process")
        self._create_directories()
        results = []
        
        # Save files to raw_data directory
        print("INFO: Saving files to raw_data directory")
        file_results = await self._save_files(files)
        results.extend(file_results)
        
        # Run ingest.py in background and move files after success
        print("INFO: Starting ingest and move process")
        ingest_results = await self._run_ingest_process_and_move_files()
        results.extend(ingest_results)
        
        print("INFO: File upload process completed")
        return {"files": results}