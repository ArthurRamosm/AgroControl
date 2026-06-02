using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/afastamentos")]
public class AfastamentosController(AfastamentoService afastamentoService) : ControllerBase
{
    private readonly AfastamentoService _service = afastamentoService;

    [HttpGet("{propriedadeId:int}")]
    public async Task<IActionResult> Listar(int propriedadeId)
    {
        var resultado = await _service.ListarAsync(propriedadeId);
        return Ok(resultado);
    }

    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastrarAfastamentoDto dto)
    {
        if (!ModelState.IsValid)
        {
            var mensagem = ModelState.Values.SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage).FirstOrDefault() ?? "Dados inválidos.";
            return BadRequest(new { sucesso = false, mensagem });
        }

        var (sucesso, msg, id) = await _service.CadastrarAsync(dto);
        if (!sucesso) return BadRequest(new { sucesso, mensagem = msg });
        return Ok(new { sucesso, mensagem = msg, id });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Atualizar(int id, [FromQuery] int propriedadeId, [FromBody] AtualizarAfastamentoDto dto)
    {
        var (sucesso, msg) = await _service.AtualizarAsync(id, propriedadeId, dto);
        if (!sucesso) return NotFound(new { sucesso, mensagem = msg });
        return Ok(new { sucesso, mensagem = msg });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id, [FromQuery] int propriedadeId)
    {
        var (sucesso, msg) = await _service.ExcluirAsync(id, propriedadeId);
        if (!sucesso) return NotFound(new { sucesso, mensagem = msg });
        return Ok(new { sucesso, mensagem = msg });
    }
}
