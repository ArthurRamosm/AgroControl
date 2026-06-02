using AgroControl.API.Data;
using AgroControl.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/propriedades")]
public class PropriedadesController(AppDbContext db) : ControllerBase
{
    private readonly AppDbContext _db = db;

    private static readonly string[] FocosValidos = ["leite", "corte", "ambos"];

    [HttpGet("{id}")]
    public async Task<IActionResult> Obter(int id)
    {
        if (id <= 0)
            return BadRequest(new { sucesso = false, mensagem = "ID da propriedade é obrigatório." });

        var propriedade = await _db.Propriedades
            .Where(p => p.Id == id)
            .Select(p => new PropriedadeResumoDto
            {
                Id = p.Id,
                Nome = p.Nome,
                Cidade = p.Cidade,
                Estado = p.Estado,
                FocoProdutivo = p.FocoProdutivo,
            })
            .FirstOrDefaultAsync();

        if (propriedade is null)
            return NotFound(new { sucesso = false, mensagem = "Propriedade não encontrada." });

        return Ok(propriedade);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] AtualizarPropriedadeDto request)
    {
        var propriedade = await _db.Propriedades.FindAsync(id);
        if (propriedade is null)
            return NotFound(new { sucesso = false, mensagem = "Propriedade não encontrada." });

        if (request.Cidade is not null)
            propriedade.Cidade = request.Cidade.Trim();
        if (request.Estado is not null)
            propriedade.Estado = request.Estado.Trim().ToUpper();
        if (request.FocoProdutivo is not null)
        {
            var foco = request.FocoProdutivo.Trim().ToLower();
            if (FocosValidos.Contains(foco))
                propriedade.FocoProdutivo = foco;
        }

        await _db.SaveChangesAsync();
        return Ok(new { sucesso = true, mensagem = "Propriedade atualizada." });
    }
}
