using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/animais")]
public class AnimaisController(AnimaisService service, ILogger<AnimaisController> logger) : ControllerBase
{
    private readonly AnimaisService _service = service;
    private readonly ILogger<AnimaisController> _logger = logger;

    // GET /api/animais?propriedadeId=1
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade é obrigatório." });

        _logger.LogInformation("Listando animais da propriedade {PropriedadeId}", propriedadeId);
        var animais = await _service.ListarAsync(propriedadeId);
        return Ok(animais);
    }

    // POST /api/animais
    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastrarAnimalDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        _logger.LogInformation("Cadastrando animal {Brinco} na propriedade {PropriedadeId}", dto.Brinco, dto.PropriedadeId);
        var (sucesso, mensagem, id) = await _service.CadastrarAsync(dto);
        if (!sucesso)
            return Conflict(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem, id });
    }

    // PUT /api/animais/{id}?propriedadeId=1
    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(int id, [FromQuery] int propriedadeId, [FromBody] CadastrarAnimalDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade é obrigatório." });

        _logger.LogInformation("Atualizando animal {Id} da propriedade {PropriedadeId}", id, propriedadeId);
        var (sucesso, mensagem) = await _service.AtualizarAsync(id, propriedadeId, dto);
        if (!sucesso)
            return NotFound(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem });
    }

    // DELETE /api/animais/{id}?propriedadeId=1
    [HttpDelete("{id}")]
    public async Task<IActionResult> Excluir(int id, [FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade é obrigatório." });

        _logger.LogInformation("Excluindo animal {Id} da propriedade {PropriedadeId}", id, propriedadeId);
        var (sucesso, mensagem) = await _service.ExcluirAsync(id, propriedadeId);
        if (!sucesso)
            return NotFound(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem });
    }

    private string PrimeiraMensagemErro() =>
        ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .FirstOrDefault() ?? "Dados inválidos.";
}
