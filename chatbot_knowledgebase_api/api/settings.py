import configparser
import os
from typing import Dict, Any

class Settings:
    def __init__(self, config_path: str = None):
        # Use multiple possible paths if no specific path provided
        if config_path is None:
            self.config_paths = [
                './config/config',           # When running from api directory
                './api/config/config',       # When running from parent directory
                'api/config/config',         # Alternative path
                os.path.join(os.path.dirname(__file__), 'config/config')  # Relative to this file
            ]
        else:
            self.config_paths = [config_path]
    
    def _find_and_load_config(self):
        """Find and load the config file from possible paths"""
        config = configparser.ConfigParser()
        
        for config_path in self.config_paths:
            if os.path.exists(config_path):
                config.read(config_path)
                print(f"Settings config loaded from: {config_path}")
                return config
        
        print("Settings config file not found in any expected location")
        raise FileNotFoundError("Config file not found")
    
    def get_all_config(self):
        """Read all configuration from config file"""
        try:
            config = self._find_and_load_config()
            
            # Read proxy settings
            proxy_config = {
                "username": config.get('proxy', 'username', fallback=''),
                "password": config.get('proxy', 'password', fallback=''),
                "host": config.get('proxy', 'host', fallback=''),
                "port": config.get('proxy', 'port', fallback='8080')
            }
            
            # Read server settings
            server_config = {
                "host": config.get('server', 'host', fallback='localhost'),
                "port": config.get('server', 'port', fallback='8000'),
                "protocol": config.get('server', 'protocol', fallback='http')
            }
            
            # Read LLM model settings
            llm_config = {
                "llm_model": config.get('llm_models', 'model', fallback='gpt-4o'),
                "base_url": config.get('llm_models', 'base_url', fallback=''),
                "temperature": config.getfloat('llm_models', 'temperature', fallback=0.0),
                "openai_api_key": config.get('llm_models', 'openai_api_key', fallback='')
            }
            
            # Read embedding model settings
            embedding_config = {
                "embedding_model": config.get('embedding_model', 'model', fallback='text-embedding-3-small'),
                "base_url": config.get('embedding_model', 'base_url', fallback=''),
                "temperature": config.getfloat('embedding_model', 'temperature', fallback=0.0),
                "openai_api_key": config.get('embedding_model', 'openai_api_key', fallback='')
            }
            
            # Combine model settings for backward compatibility
            model_config = {
                "llm_model": llm_config["llm_model"],
                "embedding_model": embedding_config["embedding_model"],
                "temperature": llm_config["temperature"],
                "openai_api_key": llm_config["openai_api_key"],
                "llm_base_url": llm_config["base_url"],
                "embedding_base_url": embedding_config["base_url"],
                "embedding_api_key": embedding_config["openai_api_key"]
            }
            
            return {
                "proxy": proxy_config,
                "server": server_config,
                "models": model_config
            }
        except Exception as e:
            return {
                "error": f"Failed to read config: {str(e)}",
                "proxy": {},
                "server": {"host": "localhost", "port": "8000", "protocol": "http"},
                "models": {
                    "llm_model": "gpt-4o",
                    "embedding_model": "text-embedding-3-small",
                    "temperature": 0.0,
                    "openai_api_key": "",
                    "llm_base_url": "",
                    "embedding_base_url": "",
                    "embedding_api_key": ""
                }
            }
    
    def update_config(self, config_data: Dict[str, Any]):
        """Update configuration file with new data"""
        try:
            config = self._find_and_load_config()
            
            # Find the config file path for writing
            config_file_path = None
            for config_path in self.config_paths:
                if os.path.exists(config_path):
                    config_file_path = config_path
                    break
            
            if not config_file_path:
                raise FileNotFoundError("Config file not found for updating")
            
            print(config_data)
            # Update proxy settings if provided
            if 'proxy' in config_data:
                if not config.has_section('proxy'):
                    config.add_section('proxy')
                
                proxy_data = config_data['proxy']
                if 'username' in proxy_data:
                    config.set('proxy', 'username', proxy_data['username'])
                if 'password' in proxy_data:
                    config.set('proxy', 'password', proxy_data['password'])
                if 'host' in proxy_data:
                    config.set('proxy', 'host', proxy_data['host'])
                if 'port' in proxy_data:
                    config.set('proxy', 'port', str(proxy_data['port']))

            # Update server settings if provided
            if 'server' in config_data:
                if not config.has_section('server'):
                    config.add_section('server')
                
                server_data = config_data['server']
                if 'host' in server_data:
                    config.set('server', 'host', server_data['host'])
                if 'port' in server_data:
                    config.set('server', 'port', str(server_data['port']))
                if 'protocol' in server_data:
                    config.set('server', 'protocol', server_data['protocol'])
            
            # Update model settings if provided
            if 'models' in config_data:
                models_data = config_data['models']

                # Update LLM models section
                if not config.has_section('llm_models'):
                    config.add_section('llm_models')
                
                if 'llm_model' in models_data:
                    config.set('llm_models', 'model', models_data['llm_model'])
                if 'temperature' in models_data:
                    config.set('llm_models', 'temperature', str(models_data['temperature']))
                if 'openai_api_key' in models_data:
                    config.set('llm_models', 'openai_api_key', models_data['openai_api_key'])
                if 'llm_base_url' in models_data:
                    config.set('llm_models', 'base_url', models_data['llm_base_url'])
                
                # Update embedding model section
                if not config.has_section('embedding_model'):
                    config.add_section('embedding_model')
                
                if 'embedding_model' in models_data:
                    config.set('embedding_model', 'model', models_data['embedding_model'])
                if 'embedding_base_url' in models_data:
                    config.set('embedding_model', 'base_url', models_data['embedding_base_url'])
                if 'embedding_api_key' in models_data:
                    config.set('embedding_model', 'openai_api_key', models_data['embedding_api_key'])
                # Note: Don't automatically overwrite embedding API key with LLM API key during updates
                # This preserves the existing embedding API key unless explicitly updated
            
            # Write the updated config to file
            with open(config_file_path, 'w') as config_file:
                config.write(config_file)
            
            return {"status": "success", "message": "Configuration updated successfully"}
        
        except Exception as e:
            return {"status": "error", "message": f"Failed to update config: {str(e)}"}