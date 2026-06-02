using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/animais/{animalId:int}")]
public class AnimalFichaController(AnimalFichaService service) : ControllerBase
{
    private readonly AnimalFichaService _service = service;

    [HttpGet("eventos")]
    public async Task<IActionResult> ListarEventos(int animalId, [FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var eventos = await _service.ListarEventosAsync(animalId, propriedadeId);
        if (eventos is null)
            return NotFound(new { sucesso = false, mensagem = "Animal nao encontrado ou nao pertence a sua propriedade." });

        return Ok(eventos);
    }

    [HttpPost("eventos")]
    public async Task<IActionResult> CadastrarEvento(
        int animalId,
        [FromQuery] int propriedadeId,
        [FromBody] CadastrarAnimalEventoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var (sucesso, mensagem, id) = await _service.CadastrarEventoAsync(animalId, propriedadeId, dto);
        if (!sucesso)
            return NotFound(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem, id });
    }

    [HttpGet("lactacoes")]
    public async Task<IActionResult> ListarLactacoes(int animalId, [FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var lactacoes = await _service.ListarLactacoesAsync(animalId, propriedadeId);
        if (lactacoes is null)
            return NotFound(new { sucesso = false, mensagem = "Animal nao encontrado ou nao pertence a sua propriedade." });

        return Ok(lactacoes);
    }

    [HttpPost("lactacoes")]
    public async Task<IActionResult> CadastrarLactacao(
        int animalId,
        [FromQuery] int propriedadeId,
        [FromBody] CadastrarAnimalLactacaoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var (sucesso, mensagem, id) = await _service.CadastrarLactacaoAsync(animalId, propriedadeId, dto);
        if (!sucesso)
            return NotFound(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem, id });
    }

    [HttpGet("reproducoes")]
    public async Task<IActionResult> ListarReproducoes(int animalId, [FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var reproducoes = await _service.ListarReproducoesAsync(animalId, propriedadeId);
        if (reproducoes is null)
            return NotFound(new { sucesso = false, mensagem = "Animal nao encontrado ou nao pertence a sua propriedade." });

        return Ok(reproducoes);
    }

    [HttpPost("reproducoes")]
    public async Task<IActionResult> CadastrarReproducao(
        int animalId,
        [FromQuery] int propriedadeId,
        [FromBody] CadastrarAnimalReproducaoDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var (sucesso, mensagem, id) = await _service.CadastrarReproducaoAsync(animalId, propriedadeId, dto);
        if (!sucesso)
            return NotFound(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem, id });
    }

    private string PrimeiraMensagemErro() =>
        ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .FirstOrDefault() ?? "Dados invalidos.";
}
