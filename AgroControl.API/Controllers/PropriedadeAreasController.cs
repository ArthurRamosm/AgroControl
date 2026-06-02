using Microsoft.AspNetCore.Mvc;
using AgroControl.API.DTOs;
using AgroControl.API.Services;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/propriedade-areas")]
public class PropriedadeAreasController(PropriedadeAreaService service) : ControllerBase
{
    private readonly PropriedadeAreaService _service = service;

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int propriedadeId)
    {
        if (propriedadeId <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade e obrigatorio." });

        var areas = await _service.ListarAsync(propriedadeId);
        return Ok(areas);
    }

    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastrarPropriedadeAreaDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { sucesso = false, mensagem = PrimeiraMensagemErro() });

        var (sucesso, mensagem, id) = await _service.CadastrarAsync(dto);
        if (!sucesso)
            return BadRequest(new { sucesso = false, mensagem });

        return Ok(new { sucesso = true, mensagem, id });
    }

    private string PrimeiraMensagemErro() =>
        ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .FirstOrDefault() ?? "Dados invalidos.";
}
