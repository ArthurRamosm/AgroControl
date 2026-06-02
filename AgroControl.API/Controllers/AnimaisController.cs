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

    // GET /api/animais?propriedadeId=1&busca=Mimosa&ativo=true&vendido=false&doente=true
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] int propriedadeId,
        [FromQuery] string? busca = null,
        [FromQuery] bool? ativo = null,
        [FromQuery] bool? vendido = null,
        [FromQuery] bool? doente = null)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade é obrigatório." });

        _logger.LogInformation("Listando animais da propriedade {PropriedadeId} busca={Busca}", propriedadeId, busca);
        var animais = await _service.ListarAsync(propriedadeId, busca, ativo, vendido, doente);
        return Ok(animais);
    }

    // GET /api/animais/buscar-filiacao?propriedadeId=1&termo=BR-001
    [HttpGet("buscar-filiacao")]
    public async Task<IActionResult> BuscarFiliacao(
        [FromQuery] int propriedadeId,
        [FromQuery] string termo,
        [FromQuery] int? ignorarAnimalId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade Ã© obrigatÃ³rio." });

        if (string.IsNullOrWhiteSpace(termo))
            return BadRequest(new { sucesso = false, mensagem = "Informe o nÃºmero ou brinco do animal." });

        var animal = await _service.BuscarFiliacaoAsync(propriedadeId, termo, ignorarAnimalId);
        if (animal is null)
            return NotFound(new { sucesso = false, mensagem = "Animal nÃ£o encontrado, preencha manualmente." });

        return Ok(animal);
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
