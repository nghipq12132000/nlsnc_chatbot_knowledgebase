from pydantic import BaseModel
from typing import Optional

class ProxyConfig(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    host: Optional[str] = None
    port: Optional[str] = None

class ServerConfig(BaseModel):
    host: Optional[str] = None
    port: Optional[str] = None
    protocol: Optional[str] = None

class ModelsConfig(BaseModel):
    llm_model: Optional[str] = None
    embedding_model: Optional[str] = None
    temperature: Optional[float] = None
    openai_api_key: Optional[str] = None
    llm_base_url: Optional[str] = None
    embedding_base_url: Optional[str] = None
    embedding_api_key: Optional[str] = None

class SettingsUpdate(BaseModel):
    proxy: Optional[ProxyConfig] = None
    server: Optional[ServerConfig] = None
    models: Optional[ModelsConfig] = None