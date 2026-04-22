using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Usuario) || string.IsNullOrWhiteSpace(request.Senha))
            return BadRequest(new LoginResponseDto
            {
                Sucesso = false,
                Mensagem = "Usuário e senha são obrigatórios"
            });

        var resultado = await _authService.LoginAsync(request);

        if (!resultado.Sucesso)
            return Unauthorized(resultado);

        return Ok(resultado);
    }
}
