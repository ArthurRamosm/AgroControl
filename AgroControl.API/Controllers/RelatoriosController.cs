using Microsoft.AspNetCore.Mvc;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/relatorios")]
public class RelatoriosController(RelatorioService relatorioService) : ControllerBase
{
    private readonly RelatorioService _service = relatorioService;

    [HttpGet("{propriedadeId:int}/produtividade")]
    public async Task<IActionResult> Produtividade(
        int propriedadeId,
        [FromQuery] DateTime? dataInicio = null,
        [FromQuery] DateTime? dataFim = null)
        => Ok(await _service.ProdutividadeAsync(propriedadeId, dataInicio, dataFim));

    [HttpGet("{propriedadeId:int}/sanitario")]
    public async Task<IActionResult> Sanitario(
        int propriedadeId,
        [FromQuery] DateTime? dataInicio = null,
        [FromQuery] DateTime? dataFim = null)
        => Ok(await _service.SanitarioAsync(propriedadeId, dataInicio, dataFim));

    [HttpGet("{propriedadeId:int}/financeiro")]
    public async Task<IActionResult> Financeiro(
        int propriedadeId,
        [FromQuery] DateTime? dataInicio = null,
        [FromQuery] DateTime? dataFim = null)
        => Ok(await _service.FinanceiroAsync(propriedadeId, dataInicio, dataFim));

    [HttpGet("{propriedadeId:int}/reprodutivo")]
    public async Task<IActionResult> Reprodutivo(
        int propriedadeId,
        [FromQuery] DateTime? dataInicio = null,
        [FromQuery] DateTime? dataFim = null)
        => Ok(await _service.ReprodutivoAsync(propriedadeId, dataInicio, dataFim));
}
