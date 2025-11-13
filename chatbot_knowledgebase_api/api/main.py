import asyncio
import os
from pathlib import Path
from datetime import datetime
from agent import QueueCallbackHandler, agent_executor
from upload import FileUploads
from settings import Settings
from models.settings_models import SettingsUpdate

from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form

# initializing our application
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://oci-stage-navy.riraku-sys.jp",  # Production domain
        "http://oci-stage-navy.riraku-sys.jp",  # Production domain (http)
        "*"  # Allow all origins for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# streaming function
async def token_generator(content: str, streamer: QueueCallbackHandler):
    task = asyncio.create_task(agent_executor.invoke(
        input=content,
        streamer=streamer,
        verbose=True  # set to True to see verbose output in console
    ))
    # initialize various components to stream
    async for token in streamer:
        try:
            if token == "<<STEP_END>>":
                # send end of step token
                yield "</step>"
            elif tool_calls := token.message.additional_kwargs.get("tool_calls"):
                if tool_name := tool_calls[0]["function"]["name"]:
                    # send start of step token followed by step name tokens
                    yield f"<step><step_name>{tool_name}</step_name>"
                if tool_args := tool_calls[0]["function"]["arguments"]:
                    # tool args are streamed directly, ensure it's properly encoded
                    yield tool_args
        except Exception as e:
            print(f"Error streaming token: {e}")
            continue
    await task

# invoke function
@app.post("/invoke")
async def invoke(content: str = Form(...)):
    queue: asyncio.Queue = asyncio.Queue()
    streamer = QueueCallbackHandler(queue)
    # return the streaming response
    return StreamingResponse(
        token_generator(content, streamer),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.post("/admin/files-upload")
async def files_upload(files: list[UploadFile] = File(...)):
    file_uploader = FileUploads()
    return await file_uploader.upload_files(files)

@app.get("/admin/settings")
async def get_settings():
    """Get all configuration settings"""
    settings = Settings()
    return settings.get_all_config()

@app.post("/admin/settings")
async def update_settings(settings_data: SettingsUpdate):
    """Update configuration settings"""
    settings = Settings()
    # Convert Pydantic model to dict, excluding None values
    config_dict = settings_data.model_dump(exclude_none=True)
    result = settings.update_config(config_dict)
    return result

@app.get("/download")
async def download_file(filename: str = Query(..., description="Name of the file to download")):
    """Download files from data/public directory"""
    try:
        # Define the public data directory
        public_data_dir = Path("data/public_data")
        
        # Security: Prevent directory traversal attacks
        # Remove any .. or / at the beginning and normalize the path
        clean_filename = filename.replace('..', '').lstrip('/')
        file_path = public_data_dir / clean_filename

        print(f"Requested file: {filename}")
        print(f"Resolved path: {file_path}")
        
        # Ensure the resolved path is still within the public data directory
        try:
            file_path.resolve().relative_to(public_data_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Check if the file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File '{clean_filename}' not found")
        
        # Check if it's actually a file (not a directory)
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"'{clean_filename}' is not a valid file")
        
        # Return the file
        return FileResponse(
            path=str(file_path),
            filename=os.path.basename(clean_filename),  # Use just the filename for download
            media_type='application/octet-stream'  # Generic binary file type
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Handle any other unexpected errors
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

@app.get("/download/list")
async def list_downloadable_files():
    """List all files available for download in data/public directory"""
    try:
        public_data_dir = Path("data/public_data")
        
        # Check if directory exists
        if not public_data_dir.exists():
            return {"files": [], "message": "Public data directory not found"}
        
        # Get all files in the directory
        files = []
        for file_path in public_data_dir.iterdir():
            if file_path.is_file():
                file_info = {
                    "filename": file_path.name,
                    "size": file_path.stat().st_size,
                    "modified": file_path.stat().st_mtime
                }
                files.append(file_info)
        
        return {
            "files": files,
            "count": len(files),
            "directory": str(public_data_dir)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

@app.get("/admin/files")
async def list_admin_files(path: str = Query("", description="Relative path within public_data directory")):
    """List all files and directories in data/public_data with full directory structure"""
    try:
        # Base directory
        base_dir = Path("data/public_data")
        
        # Check if base directory exists
        if not base_dir.exists():
            return {"error": "Public data directory not found", "path": str(base_dir)}
        
        # Resolve the requested path
        if path and path.strip():
            # Clean the path to prevent directory traversal
            clean_path = path.strip().lstrip('/').replace('..', '')
            target_dir = base_dir / clean_path
        else:
            target_dir = base_dir
        
        # Ensure target directory is within base directory (security check)
        try:
            target_dir = target_dir.resolve()
            base_dir = base_dir.resolve()
            target_dir.relative_to(base_dir)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid path: access denied")
        
        # Check if target directory exists
        if not target_dir.exists():
            raise HTTPException(status_code=404, detail=f"Directory not found: {path}")
        
        if not target_dir.is_dir():
            raise HTTPException(status_code=400, detail=f"Path is not a directory: {path}")
        
        # Get directory contents
        items = []
        try:
            for item_path in sorted(target_dir.iterdir()):
                item_info = {
                    "name": item_path.name,
                    "type": "directory" if item_path.is_dir() else "file",
                    "path": str(item_path.relative_to(base_dir)),
                    "size": None,
                    "modified": None,
                    "extension": None
                }
                
                if item_path.is_file():
                    try:
                        stat = item_path.stat()
                        item_info.update({
                            "size": stat.st_size,
                            "modified": stat.st_mtime,
                            "extension": item_path.suffix.lower()
                        })
                    except (OSError, PermissionError):
                        # If we can't get file stats, just mark as unknown
                        item_info.update({
                            "size": 0,
                            "modified": 0,
                            "extension": item_path.suffix.lower() if item_path.suffix else None
                        })
                elif item_path.is_dir():
                    # Count items in directory
                    try:
                        dir_count = len(list(item_path.iterdir()))
                        item_info["children_count"] = dir_count
                    except (OSError, PermissionError):
                        item_info["children_count"] = 0
                
                items.append(item_info)
        
        except PermissionError:
            raise HTTPException(status_code=403, detail=f"Permission denied accessing directory: {path}")
        
        # Build breadcrumb path
        breadcrumb = []
        if path and path.strip():
            parts = path.strip().split('/')
            current_path = ""
            for part in parts:
                if part:
                    current_path = f"{current_path}/{part}" if current_path else part
                    breadcrumb.append({
                        "name": part,
                        "path": current_path
                    })
        
        return {
            "items": items,
            "current_path": path if path else "",
            "breadcrumb": breadcrumb,
            "total_items": len(items),
            "directories": len([item for item in items if item["type"] == "directory"]),
            "files": len([item for item in items if item["type"] == "file"]),
            "base_directory": str(base_dir)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing directory: {str(e)}")

@app.post("/admin/files/delete")
async def delete_file(filename: str = Query(..., description="Relative path of the file to delete")):
    """Delete a file from the data/public_data directory"""
    try:
        # Define the public data directory
        public_data_dir = Path("data/public_data")
        
        # Security: Prevent directory traversal attacks
        # Remove any .. or / at the beginning and normalize the path
        clean_filename = filename.replace('..', '').lstrip('/')
        file_path = public_data_dir / clean_filename

        print(f"Attempting to delete file: {filename}")
        print(f"Resolved path: {file_path}")
        
        # Ensure the resolved path is still within the public data directory
        try:
            file_path.resolve().relative_to(public_data_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid file path: access denied")
        
        # Check if the file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File '{clean_filename}' not found")
        
        # Check if it's actually a file (not a directory)
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail=f"'{clean_filename}' is not a valid file")
        
        # Check file permissions before deletion
        if not os.access(file_path, os.W_OK):
            raise HTTPException(status_code=403, detail=f"Permission denied: cannot delete '{clean_filename}'")
        
        # Get file info before deletion for logging
        file_size = file_path.stat().st_size
        
        # Delete the file
        file_path.unlink()
        
        print(f"Successfully deleted file: {clean_filename} (size: {file_size} bytes)")
        
        return {
            "success": True,
            "message": f"File '{clean_filename}' deleted successfully",
            "deleted_file": {
                "filename": clean_filename,
                "size": file_size,
                "deleted_at": datetime.now().isoformat()
            }
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"Permission denied: cannot delete '{filename}'")
    except Exception as e:
        # Handle any other unexpected errors
        print(f"Error deleting file {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "chatbot-api"}