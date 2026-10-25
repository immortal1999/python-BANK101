# Multi-stage: restore/publish on the SDK image, ship only the runtime.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first (better layer caching)
COPY Bank101.Api/Bank101.Api.csproj Bank101.Api/
RUN dotnet restore Bank101.Api/Bank101.Api.csproj

COPY . .
RUN dotnet publish Bank101.Api/Bank101.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Same port the Python container listens on. Caddy reverse-proxies to this over the
# internal docker network (the port is NOT published to the host).
EXPOSE 8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080

# Don't run as root.
USER $APP_UID

ENTRYPOINT ["dotnet", "Bank101.Api.dll"]
