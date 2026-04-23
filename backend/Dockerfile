FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY nuevo-pmo.sln .
COPY backend/src/Nuevo.PMO.Domain/Nuevo.PMO.Domain.csproj backend/src/Nuevo.PMO.Domain/
COPY backend/src/Nuevo.PMO.Application/Nuevo.PMO.Application.csproj backend/src/Nuevo.PMO.Application/
COPY backend/src/Nuevo.PMO.Infrastructure/Nuevo.PMO.Infrastructure.csproj backend/src/Nuevo.PMO.Infrastructure/
COPY backend/src/Nuevo.PMO.Api/Nuevo.PMO.Api.csproj backend/src/Nuevo.PMO.Api/
RUN dotnet restore backend/src/Nuevo.PMO.Api/Nuevo.PMO.Api.csproj

COPY backend/src/ backend/src/
RUN dotnet publish backend/src/Nuevo.PMO.Api/Nuevo.PMO.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "Nuevo.PMO.Api.dll"]
