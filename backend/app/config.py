from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _BACKEND_DIR.parent

load_dotenv(_BACKEND_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_BACKEND_DIR / ".env", extra="ignore")

    port: int = 4000
    storage_dir: Path = _PROJECT_ROOT / "storage" / "data"
    cors_origin: str = "*"

    llm_provider: str = "deepseek"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # 滴答清单官方 MCP：https://help.dida365.com/articles/7438132116019216384
    dida365_mcp_enabled: bool = True
    dida365_mcp_url: str = "https://mcp.dida365.com"
    dida365_mcp_token: str = ""


settings = Settings()
