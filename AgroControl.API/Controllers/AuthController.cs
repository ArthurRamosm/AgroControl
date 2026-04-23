using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService, AppDbContext db, ILogger<AuthController> logger) : ControllerBase
{
    private readonly AuthService _authService = authService;
    private readonly AppDbContext _db = db;
    private readonly ILogger<AuthController> _logger = logger;

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new LoginResponseDto { Sucesso = false, Mensagem = "Usuário e senha são obrigatórios." });

        _logger.LogInformation("Tentativa de login para usuário: {Usuario}", request.Usuario);
        var resultado = await _authService.LoginAsync(request);

        if (!resultado.Sucesso)
        {
            _logger.LogWarning("Login falhou para usuário: {Usuario}", request.Usuario);
            return Unauthorized(resultado);
        }

        _logger.LogInformation("Login bem-sucedido para usuário: {Usuario}", request.Usuario);
        return Ok(resultado);
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var mensagem = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault() ?? "Dados inválidos.";
            return BadRequest(new RegisterResponseDto { Sucesso = false, Mensagem = mensagem });
        }

        var usuarioExiste = await _db.Usuarios
            .AnyAsync(u => u.NomeUsuario == request.Usuario.ToLower());

        if (usuarioExiste)
        {
            _logger.LogWarning("Tentativa de registro com usuário já existente: {Usuario}", request.Usuario);
            return Conflict(new RegisterResponseDto
            {
                Sucesso = false,
                Mensagem = "Este nome de usuário já está em uso. Escolha outro."
            });
        }

        var emailExiste = await _db.Usuarios
            .AnyAsync(u => u.Email == request.Email.ToLower());

        if (emailExiste)
        {
            _logger.LogWarning("Tentativa de registro com e-mail já cadastrado: {Email}", request.Email);
            return Conflict(new RegisterResponseDto
            {
                Sucesso = false,
                Mensagem = "Este e-mail já está cadastrado. Use outro ou faça login."
            });
        }

        _logger.LogInformation("Registrando novo usuário: {Usuario}", request.Usuario);

        var propriedade = new Propriedade
        {
            Nome = request.Propriedade.Nome.Trim(),
            Cidade = request.Propriedade.Cidade.Trim(),
            Estado = request.Propriedade.Estado.ToUpper()
        };
        _db.Propriedades.Add(propriedade);
        await _db.SaveChangesAsync();

        var usuario = new Usuario
        {
            Nome = request.Nome.Trim(),
            Email = request.Email.Trim().ToLower(),
            NomeUsuario = request.Usuario.Trim().ToLower(),
            Senha = request.Senha,
            PropriedadeId = propriedade.Id
        };
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Usuário {Usuario} cadastrado com sucesso (PropriedadeId: {PropriedadeId})",
            usuario.NomeUsuario, propriedade.Id);

        return Ok(new RegisterResponseDto
        {
            Sucesso = true,
            Mensagem = "Cadastro realizado com sucesso!"
        });
    }
}
