using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/financeiro")]
public class FinanceiroController(FinanceiroService financeiroService) : ControllerBase
{
    private readonly FinanceiroService _service = financeiroService;

    [HttpGet("{propriedadeId:int}/resumo")]
    public async Task<IActionResult> Resumo(int propriedadeId)
    {
        var resultado = await _service.ObterResumoAsync(propriedadeId);
        return Ok(resultado);
    }

    [HttpGet("{propriedadeId:int}/evolucao")]
    public async Task<IActionResult> Evolucao(int propriedadeId, [FromQuery] int meses = 3)
    {
        var resultado = await _service.ObterEvolucaoAsync(propriedadeId, meses);
        return Ok(resultado);
    }

    [HttpGet("{propriedadeId:int}/despesas-categoria")]
    public async Task<IActionResult> DespesasCategoria(int propriedadeId)
    {
        var resultado = await _service.ObterDespesasPorCategoriaAsync(propriedadeId);
        return Ok(resultado);
    }

    [HttpGet("{propriedadeId:int}/custo-por-animal")]
    public async Task<IActionResult> CustoPorAnimal(
        int propriedadeId, [FromQuery] string? mes = null)
    {
        var resultado = await _service.ObterCustoPorAnimalAsync(propriedadeId, mes);
        return Ok(resultado);
    }

    [HttpGet("{propriedadeId:int}/custo-por-animal/{animalId:int}")]
    public async Task<IActionResult> CustoAnimalEspecifico(int propriedadeId, int animalId)
    {
        var resultado = await _service.ObterCustoAnimalEspecificoAsync(propriedadeId, animalId);
        if (resultado is null)
            return NotFound(new { sucesso = false, mensagem = "Animal não encontrado." });
        return Ok(resultado);
    }

    [HttpGet("{propriedadeId:int}/alertas")]
    public async Task<IActionResult> Alertas(int propriedadeId)
    {
        var resultado = await _service.ObterAlertasAsync(propriedadeId);
        return Ok(resultado);
    }

    [HttpPost("despesa")]
    public async Task<IActionResult> CadastrarDespesa([FromBody] CadastrarDespesaDto dto)
    {
        if (!ModelState.IsValid)
        {
            var mensagem = ModelState.Values.SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage).FirstOrDefault() ?? "Dados inválidos.";
            return BadRequest(new { sucesso = false, mensagem });
        }

        var (sucesso, msg) = await _service.CadastrarDespesaAsync(dto);
        return Ok(new { sucesso, mensagem = msg });
    }

    [HttpPost("receita")]
    public async Task<IActionResult> CadastrarReceita([FromBody] CadastrarReceitaDto dto)
    {
        if (!ModelState.IsValid)
        {
            var mensagem = ModelState.Values.SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage).FirstOrDefault() ?? "Dados inválidos.";
            return BadRequest(new { sucesso = false, mensagem });
        }

        var (sucesso, msg) = await _service.CadastrarReceitaAsync(dto);
        return Ok(new { sucesso, mensagem = msg });
    }
}
