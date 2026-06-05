from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://localhost/realty"
    DIRECTUS_SECRET: str = "dev-secret"
    DIRECTUS_PUBLIC_URL: str = "http://localhost:8055"
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET: str = ""
    R2_BUCKET_NAME: str = "realty-media"  # alias used by docker-compose
    R2_ENDPOINT_URL: str = ""
    R2_ENDPOINT: str = "https://example.r2.cloudflarestorage.com"  # alias used by docker-compose
    R2_PUBLIC_URL: str = ""

    @property
    def r2_bucket(self) -> str:
        return self.R2_BUCKET or self.R2_BUCKET_NAME

    @property
    def r2_endpoint_url(self) -> str:
        return self.R2_ENDPOINT_URL or self.R2_ENDPOINT
    REDIS_URL: str = ""
    EMAIL_PROVIDER: str = "postmark"
    EMAIL_API_KEY: str = ""
    EMAIL_FROM: str = ""
    EMAIL_CENTRAL_INBOX: str = ""
    SITE_URL: str = "http://localhost:3000"


settings = Settings()
