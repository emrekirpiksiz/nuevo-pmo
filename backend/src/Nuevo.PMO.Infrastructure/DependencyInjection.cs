using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nuevo.PMO.Application.Common.Interfaces;
using Nuevo.PMO.Infrastructure.Auth;
using Nuevo.PMO.Infrastructure.Persistence;
using Nuevo.PMO.Infrastructure.Services;

namespace Nuevo.PMO.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));
        services.Configure<O365Options>(configuration.GetSection("O365"));
        services.Configure<SmtpOptions>(configuration.GetSection("Smtp"));
        services.Configure<AppOptions>(configuration.GetSection("App"));

        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:Default in configuration.");

        services.AddDbContext<AppDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npg =>
            {
                npg.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                npg.MigrationsHistoryTable("__ef_migrations_history", "pmo");
                // Büyük dokümanlar (100+ sayfa markdown / birkaç MB jsonb) için
                // Npgsql'in default 30s timeout'unu 120s'e çek. Uygulama kodu
                // kritik sorgularda projection kullanarak bu limiti aşmamalı;
                // buradaki yüksek değer yalnız güvenlik ağıdır.
                npg.CommandTimeout(120);
            });
        });
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        services.AddHttpClient();

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IDateTime, DateTimeService>();
        services.AddSingleton<IDocxExporter, DocxExporter>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<INotificationSender, NotificationSender>();
        services.AddScoped<IO365AuthService, O365AuthService>();

        return services;
    }
}
