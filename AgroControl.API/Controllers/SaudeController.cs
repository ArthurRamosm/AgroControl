using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/saude")]
public class SaudeController(SaudeService service, ILogger<SaudeController> logger) : ControllerBase
{
    private readonly SaudeService _service = service;
    private readonly ILogger<SaudeController> _logger = logger;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var resultado = await _service.ListarAsync(propriedadeId);
        return Ok(resultado);
    }

    // GET /api/saude/{propriedadeId}/estatisticas
    [HttpGet("{propriedadeId:int}/estatisticas")]
    public async Task<IActionResult> Estatisticas(int propriedadeId)
    {
        var stats = await _service.EstatisticasAsync(propriedadeId);
        return Ok(stats);
    }

    [HttpPost("vacinas")]
    public async Task<IActionResult> RegistrarVacina(
        [FromQuery] int propriedadeId,
        [FromBody] RegistrarVacinaDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var (sucesso, mensagem, id) = await _service.RegistrarVacinaAsync(propriedadeId, dto);
        if (!sucesso)
            return NotFound(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem, id });
    }

    [HttpGet("registros")]
    public async Task<IActionResult> ListarRegistros([FromQuery] int propriedadeId, [FromQuery] int animalId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });
        if (animalId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "Animal e obrigatorio." });

        var registros = await _service.ListarRegistrosAsync(propriedadeId, animalId);
        if (registros is null)
            return NotFound(new { sucesso = false, mensagem = "Animal nao encontrado ou nao pertence a sua propriedade." });

        return Ok(registros);
    }

    [HttpGet("historico")]
    public async Task<IActionResult> Historico(
        [FromQuery] int propriedadeId,
        [FromQuery] DateTime? dataInicio = null,
        [FromQuery] DateTime? dataFim = null)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var resultado = await _service.ObterHistoricoAsync(propriedadeId, dataInicio, dataFim);
        return Ok(resultado);
    }

    [HttpPost("vacinas/lote")]
    public async Task<IActionResult> RegistrarVacinaLote(
        [FromQuery] int propriedadeId,
        [FromBody] LoteVacinaDto dto)
    {
        _logger.LogInformation("Lote vacina recebido: propriedadeId={PropId}, animalIds=[{Ids}], vacina={Vacina}, data={Data}",
            propriedadeId,
            string.Join(",", dto?.AnimalIds ?? new()),
            dto?.NomeVacina,
            dto?.DataAplicacao);

        if (!ModelState.IsValid)
        {
            var msg = PrimeiraMensagemErro();
            _logger.LogWarning("Lote vacina: ModelState inválido — {Msg}", msg);
            return BadRequest(new { sucesso = false, mensagem = msg });
        }

        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var resultado = await _service.RegistrarVacinaLoteAsync(propriedadeId, dto);

        _logger.LogInformation("Lote vacina resultado: sucesso={Sucesso}, registros={Reg}, msg={Msg}",
            resultado.Sucesso, resultado.Registros, resultado.Mensagem);

        if (!resultado.Sucesso)
            return BadRequest(new { sucesso = false, mensagem = resultado.Mensagem });

        return Ok(resultado);
    }

    [HttpPost("vermifugacao/lote")]
    public async Task<IActionResult> RegistrarVermifugacaoLote(
        [FromQuery] int propriedadeId,
        [FromBody] LoteVermifugacaoDto dto)
    {
        _logger.LogInformation("Lote vermifugação recebido: propriedadeId={PropId}, animalIds=[{Ids}], produto={Produto}, data={Data}",
            propriedadeId,
            string.Join(",", dto?.AnimalIds ?? new()),
            dto?.ProdutoUtilizado,
            dto?.DataAplicacao);

        if (!ModelState.IsValid)
        {
            var msg = PrimeiraMensagemErro();
            _logger.LogWarning("Lote vermifugação: ModelState inválido — {Msg}", msg);
            return BadRequest(new { sucesso = false, mensagem = msg });
        }

        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var resultado = await _service.RegistrarVermifugacaoLoteAsync(propriedadeId, dto);

        _logger.LogInformation("Lote vermifugação resultado: sucesso={Sucesso}, registros={Reg}, msg={Msg}",
            resultado.Sucesso, resultado.Registros, resultado.Mensagem);

        if (!resultado.Sucesso)
            return BadRequest(new { sucesso = false, mensagem = resultado.Mensagem });

        return Ok(resultado);
    }

    [HttpPost("registros")]
    public async Task<IActionResult> RegistrarSaudeRegistro(
        [FromQuery] int propriedadeId,
        [FromBody] RegistrarSaudeRegistroDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var (sucesso, mensagem, id) = await _service.RegistrarSaudeRegistroAsync(propriedadeId, dto);
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
