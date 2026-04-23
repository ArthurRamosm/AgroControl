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

// Controllers
builder.Services.AddControllers();

// CORS — permite o app React Native acessar a API
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();
app.UseHttpsRedirection();
app.MapControllers();

app.Run();
