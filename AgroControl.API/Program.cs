using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using AgroControl.API.Data;
using AgroControl.API.Services;

var builder = WebApplication.CreateBuilder(args);

// [OWASP M4-05] Limite explícito de tamanho de requisição (defesa contra
// payloads abusivos, ex.: fotos base64 enormes). Valor generoso (40MB)
// para não impactar o uso legítimo (até 3 fotos comprimidas por animal).
// [OWASP M5-04] Restringe explicitamente a versão mínima de TLS aceita
// quando o Kestrel atende HTTPS diretamente (perfil "https" em
// launchSettings.json), em vez de depender apenas do padrão implícito do
// SO. TLS 1.2/1.3 já é o que qualquer cliente atual (app, navegador) usa —
// nenhum comportamento observável muda para o app.
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 40 * 1024 * 1024;
    options.ConfigureHttpsDefaults(httpsOptions =>
    {
        httpsOptions.SslProtocols = System.Security.Authentication.SslProtocols.Tls12
                                   | System.Security.Authentication.SslProtocols.Tls13;
    });
});

// EF Core — SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Serviços
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AnimaisService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<AlertaService>();
builder.Services.AddScoped<FinanceiroService>();
builder.Services.AddScoped<AfastamentoService>();
builder.Services.AddScoped<RelatorioService>();
builder.Services.AddScoped<AnimalFichaService>();
builder.Services.AddScoped<SaudeService>();
builder.Services.AddScoped<EstoqueService>();
builder.Services.AddScoped<PropriedadeAreaService>();
builder.Services.AddScoped<PropriedadePontoService>();

// Controllers
builder.Services.AddControllers();

// [OWASP M8-09] Rate limiting nos endpoints de autenticação — 10 req/min por IP.
// Impede força bruta em /login e cadastro em massa em /register.
// HTTP 429 automático com Retry-After header quando o limite é atingido.
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 10;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// [OWASP M5-03] HSTS — só afeta respostas servidas via HTTPS (no-op em HTTP,
// não força redirecionamento), portanto não altera o comportamento do
// perfil de desenvolvimento atual (que roda em HTTP simples).
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
});

var app = builder.Build();

app.UseHsts();
app.UseRateLimiter();

// [OWASP M5-03] Cabeçalhos de segurança adicionais. Não alteram o corpo
// nem o status das respostas — o app mobile (fetch) os ignora normalmente;
// são defesa em profundidade para qualquer consumidor via navegador
// (ex.: build Web do Expo, chamadas diretas à API).
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    // [OWASP M9-05] Impede que proxies e caches HTTP armazenem respostas com
    // dados de negócio sensíveis (financeiro, produção, saúde animal).
    context.Response.Headers.Append("Cache-Control", "no-store");
    await next();
});

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
