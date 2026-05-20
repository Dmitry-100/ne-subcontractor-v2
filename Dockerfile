FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY Directory.Build.props Directory.Packages.props Subcontractor.sln ./
COPY src/Subcontractor.Domain/Subcontractor.Domain.csproj src/Subcontractor.Domain/
COPY src/Subcontractor.Application/Subcontractor.Application.csproj src/Subcontractor.Application/
COPY src/Subcontractor.Infrastructure/Subcontractor.Infrastructure.csproj src/Subcontractor.Infrastructure/
COPY src/Subcontractor.Web/Subcontractor.Web.csproj src/Subcontractor.Web/

RUN dotnet restore src/Subcontractor.Web/Subcontractor.Web.csproj

COPY . .
RUN dotnet publish src/Subcontractor.Web/Subcontractor.Web.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Subcontractor.Web.dll"]
