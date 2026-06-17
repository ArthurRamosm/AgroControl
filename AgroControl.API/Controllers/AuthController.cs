using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
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

        _logger.LogInformation("Tentativa de login para usuário hash={UsuarioHash}", HashLog(request.Usuario));
        var resultado = await _authService.LoginAsync(request);

        if (!resultado.Sucesso)
        {
            _logger.LogWarning("Login falhou para usuário: {Usuario}", request.Usuario);
            return Unauthorized(resultado);
        }

        _logger.LogInformation("Login bem-sucedido para usuário hash={UsuarioHash}", HashLog(request.Usuario));
        return Ok(resultado);
    }

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

        _logger.LogInformation("Registrando novo usuário hash={UsuarioHash}", HashLog(request.Usuario));

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
            // [OWASP M1] Senha nunca é gravada em texto plano — ver AuthService.GerarHash.
            Senha = AuthService.GerarHash(request.Senha),
            PropriedadeId = propriedade.Id
        };
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Usuário hash={UsuarioHash} cadastrado com sucesso (PropriedadeId: {PropriedadeId})",
            HashLog(usuario.NomeUsuario), propriedade.Id);

        return Ok(new RegisterResponseDto
        {
            Sucesso = true,
            Mensagem = "Cadastro realizado com sucesso!"
        });
    }

    // PUT /api/auth/perfil
    [HttpPut("perfil")]
    public async Task<IActionResult> AtualizarPerfil([FromBody] AtualizarPerfilDto request)
    {
        var usuario = await _db.Usuarios.FindAsync(request.UsuarioId);
        if (usuario is null)
            return NotFound(new { sucesso = false, mensagem = "Usuário não encontrado." });

        if (!string.IsNullOrWhiteSpace(request.Nome))
            usuario.Nome = request.Nome.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var emailEmUso = await _db.Usuarios
                .AnyAsync(u => u.Email == request.Email.ToLower() && u.Id != request.UsuarioId);
            if (emailEmUso)
                return Conflict(new { sucesso = false, mensagem = "Este e-mail já está em uso." });
            usuario.Email = request.Email.Trim().ToLower();
        }

        await _db.SaveChangesAsync();
        return Ok(new { sucesso = true, mensagem = "Perfil atualizado com sucesso." });
    }

    // PUT /api/auth/alterar-senha
    [HttpPut("alterar-senha")]
    public async Task<IActionResult> AlterarSenha([FromBody] AlterarSenhaDto request)
    {
        var usuario = await _db.Usuarios.FindAsync(request.UsuarioId);
        if (usuario is null)
            return NotFound(new { sucesso = false, mensagem = "Usuário não encontrado." });

        // [OWASP M1] Verifica contra hash BCrypt (com compatibilidade legada)
        // e grava a nova senha sempre como hash.
        if (!AuthService.VerificarSenha(request.SenhaAtual, usuario.Senha))
            return BadRequest(new { sucesso = false, mensagem = "Senha atual incorreta." });

        usuario.Senha = AuthService.GerarHash(request.NovaSenha);
        await _db.SaveChangesAsync();
        return Ok(new { sucesso = true, mensagem = "Senha alterada com sucesso." });
    }

    // DELETE /api/auth/conta
    // [OWASP M6-03 / LGPD Art. 18 VI] Direito à exclusão dos dados pessoais.
    // Usa anonimização (Art. 12 LGPD) em vez de hard-delete para preservar
    // integridade referencial das FKs de dados operacionais (financeiro, produção).
    [HttpDelete("conta")]
    public async Task<IActionResult> ExcluirConta([FromBody] ExcluirContaDto request)
    {
        var usuario = await _db.Usuarios.FindAsync(request.UsuarioId);
        if (usuario is null)
            return NotFound(new { sucesso = false, mensagem = "Usuário não encontrado." });

        if (!AuthService.VerificarSenha(request.Senha, usuario.Senha))
            return BadRequest(new { sucesso = false, mensagem = "Senha incorreta." });

        _logger.LogInformation("Exclusão de conta solicitada para hash={UsuarioHash}", HashLog(usuario.NomeUsuario));

        usuario.Nome = "Conta Excluída";
        usuario.Email = $"excluido-{usuario.Id}@removido.local";
        usuario.NomeUsuario = $"excluido-{usuario.Id}";
        usuario.Senha = Convert.ToHexString(SHA256.HashData(Guid.NewGuid().ToByteArray()));

        await _db.SaveChangesAsync();

        _logger.LogInformation("Conta anonimizada (LGPD Art. 12) para Id={UsuarioId}", usuario.Id);

        return Ok(new { sucesso = true, mensagem = "Conta excluída com sucesso." });
    }

    // [OWASP M6-02] Pseudonimiza identificadores em logs de INFO de longa retenção.
    // Logs de WARNING mantêm o valor em claro para suporte a investigação de incidentes.
    private static string HashLog(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)))[..8];
}
