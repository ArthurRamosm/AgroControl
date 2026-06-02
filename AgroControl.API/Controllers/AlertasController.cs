using Microsoft.AspNetCore.Mvc;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/alertas")]
public class AlertasController(AlertaService alertaService) : ControllerBase
{
    private readonly AlertaService _service = alertaService;

    [HttpGet("{propriedadeId:int}")]
    public async Task<IActionResult> Listar(int propriedadeId)
    {
        var alertas = await _service.ListarAsync(propriedadeId);
        return Ok(alertas);
    }

    [HttpPut("{id:int}/lido")]
    public async Task<IActionResult> MarcarLido(int id, [FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade é obrigatório." });

        var (sucesso, mensagem) = await _service.MarcarLidoAsync(id, propriedadeId);
        if (!sucesso) return NotFound(new { sucesso, mensagem });
        return Ok(new { sucesso, mensagem });
    }
}
