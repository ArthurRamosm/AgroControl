using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/estoque")]
public class EstoqueController(EstoqueService service) : ControllerBase
{
    private readonly EstoqueService _service = service;

    // GET /api/estoque/{propriedadeId}
    [HttpGet("{propriedadeId:int}")]
    public async Task<IActionResult> Listar(int propriedadeId)
    {
        var lista = await _service.ListarAsync(propriedadeId);
        return Ok(lista);
    }

    // POST /api/estoque
    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastrarEstoqueDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        var (sucesso, mensagem, id) = await _service.CadastrarAsync(dto);
        if (!sucesso) return BadRequest(new { sucesso, mensagem });
        return Ok(new { sucesso, mensagem, id });
    }

    // PUT /api/estoque/{id}?propriedadeId=1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Atualizar(int id, [FromQuery] int propriedadeId, [FromBody] AtualizarEstoqueDto dto)
    {
        var (sucesso, mensagem) = await _service.AtualizarAsync(id, propriedadeId, dto);
        if (!sucesso) return NotFound(new { sucesso, mensagem });
        return Ok(new { sucesso, mensagem });
    }

    // DELETE /api/estoque/{id}?propriedadeId=1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id, [FromQuery] int propriedadeId)
    {
        var (sucesso, mensagem) = await _service.ExcluirAsync(id, propriedadeId);
        if (!sucesso) return NotFound(new { sucesso, mensagem });
        return Ok(new { sucesso, mensagem });
    }

    // POST /api/estoque/{id}/entrada?propriedadeId=1
    [HttpPost("{id:int}/entrada")]
    public async Task<IActionResult> Entrada(int id, [FromQuery] int propriedadeId, [FromBody] EntradaEstoqueDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        var (sucesso, mensagem) = await _service.RegistrarEntradaAsync(id, propriedadeId, dto);
        if (!sucesso) return BadRequest(new { sucesso, mensagem });
        return Ok(new { sucesso, mensagem });
    }

    // POST /api/estoque/{id}/saida?propriedadeId=1
    [HttpPost("{id:int}/saida")]
    public async Task<IActionResult> Saida(int id, [FromQuery] int propriedadeId, [FromBody] SaidaEstoqueDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        var (sucesso, mensagem) = await _service.RegistrarSaidaAsync(id, propriedadeId, dto);
        if (!sucesso) return BadRequest(new { sucesso, mensagem });
        return Ok(new { sucesso, mensagem });
    }

    // GET /api/estoque/{propriedadeId}/alertas
    [HttpGet("{propriedadeId:int}/alertas")]
    public async Task<IActionResult> Alertas(int propriedadeId)
    {
        var alertas = await _service.AlertasAsync(propriedadeId);
        return Ok(alertas);
    }

    // GET /api/estoque/{propriedadeId}/historico
    [HttpGet("{propriedadeId:int}/historico")]
    public async Task<IActionResult> Historico(int propriedadeId)
    {
        var historico = await _service.ListarMovimentacoesAsync(propriedadeId);
        return Ok(historico);
    }

    private string PrimeiraMensagemErro() =>
        ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .FirstOrDefault() ?? "Dados inválidos.";
}
