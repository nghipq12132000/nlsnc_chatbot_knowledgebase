import configparser

def load_proxy_config():
    """Load proxy configuration from ./config/config file"""
    import os
    try:
        config = configparser.ConfigParser()
        # Try multiple possible paths for the config file
        config_paths = [
            './config/config',           # When running from api directory
            './api/config/config',       # When running from parent directory
            'api/config/config',         # Alternative path
            os.path.join(os.path.dirname(__file__), '../../config/config')  # Relative to this file
        ]
        
        config_loaded = False
        for config_path in config_paths:
            if os.path.exists(config_path):
                config.read(config_path)
                config_loaded = True
                print(f"Config loaded from: {config_path}")
                break
        
        if not config_loaded:
            print("Config file not found in any expected location - proxy disabled")
            return None
        
        # Read proxy settings from config file
        username = config.get('proxy', 'username', fallback='').strip()
        password = config.get('proxy', 'password', fallback='').strip()
        proxy_host = config.get('proxy', 'host', fallback='').strip()
        proxy_port = config.get('proxy', 'port', fallback='8080').strip()
        
        # Check if all required proxy fields are present and not empty
        if username and password and proxy_host and proxy_port:
            # Additional validation for empty strings or whitespace-only values
            if all([username, password, proxy_host, proxy_port]) and \
               all([field.strip() for field in [username, password, proxy_host, proxy_port]]):
                proxy_url = f'http://{username}:{password}@{proxy_host}:{proxy_port}'
                print(f"Proxy configuration loaded successfully")
                return proxy_url
            else:
                print("Proxy configuration found but contains empty values - proxy disabled")
                return None
        else:
            print("Proxy configuration incomplete or missing - proxy disabled")
            return None
    except Exception as e:
        print(f"Error reading proxy config: {e} - proxy disabled")
        return None

def load_model_config():
    """Load model configuration from ./config/config file"""
    import os
    try:
        config = configparser.ConfigParser()
        # Try multiple possible paths for the config file
        config_paths = [
            './config/config',           # When running from api directory
            './api/config/config',       # When running from parent directory
            'api/config/config',         # Alternative path
            os.path.join(os.path.dirname(__file__), '../../config/config')  # Relative to this file
        ]
        
        config_loaded = False
        for config_path in config_paths:
            if os.path.exists(config_path):
                config.read(config_path)
                config_loaded = True
                print(f"Model config loaded from: {config_path}")
                break
        
        if not config_loaded:
            print("Config file not found in any expected location - using defaults")
            raise FileNotFoundError("Config file not found")
        
        # Read LLM model settings from config file
        llm_model = config.get('llm_models', 'model', fallback='gpt-4o')
        llm_base_url = config.get('llm_models', 'base_url', fallback='')
        temperature = config.getfloat('llm_models', 'temperature', fallback=0.0)
        llm_api_key = config.get('llm_models', 'openai_api_key', fallback='')
        
        # Read embedding model settings from config file
        embedding_model = config.get('embedding_model', 'model', fallback='text-embedding-3-small')
        embedding_base_url = config.get('embedding_model', 'base_url', fallback='')
        embedding_api_key = config.get('embedding_model', 'openai_api_key', fallback='')
        
        # Fall back to environment variable if not in config
        if not llm_api_key:
            llm_api_key = os.environ.get("OPENAI_API_KEY", "")
        if not embedding_api_key:
            embedding_api_key = llm_api_key  # Use same key if embedding key not specified
        
        return {
            'llm_model': llm_model,
            'llm_base_url': llm_base_url,
            'embedding_model': embedding_model,
            'embedding_base_url': embedding_base_url,
            'temperature': temperature,
            'openai_api_key': llm_api_key,
            'embedding_api_key': embedding_api_key
        }
    except Exception as e:
        print(f"Error reading model config: {e}")
        return {
            'llm_model': 'gpt-4o',
            'llm_base_url': '',
            'embedding_model': 'text-embedding-3-small',
            'embedding_base_url': '',
            'temperature': 0.0,
            'openai_api_key': os.environ.get("OPENAI_API_KEY", ""),
            'embedding_api_key': os.environ.get("OPENAI_API_KEY", "")
        }