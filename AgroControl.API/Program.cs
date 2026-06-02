using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.Services;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
