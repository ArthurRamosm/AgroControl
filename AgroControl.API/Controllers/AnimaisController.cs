using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Controllers;

[ApiController]
[Route("api/animais")]
public class AnimaisController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnimaisController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/animais
    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var animais = await _db.Animais
            .Select(a => new AnimalResponseDto
            {
                Id = a.Id,
                Brinco = a.Brinco,
                Nome = a.Nome,
                Raca = a.Raca,
                Sexo = a.Sexo,
                Tipo = a.Tipo,
                StatusLeite = a.StatusLeite,
                Ativo = a.Ativo
            })
            .ToListAsync();

        return Ok(animais);
    }

    // POST /api/animais
    [HttpPost]
    public async Task<IActionResult> Cadastrar([FromBody] CadastrarAnimalDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Brinco) ||
            string.IsNullOrWhiteSpace(dto.Raca) ||
            string.IsNullOrWhiteSpace(dto.Tipo))
        {
            return BadRequest(new { sucesso = false, mensagem = "Brinco, Raça e Tipo são obrigatórios." });
        }

        var brincoExiste = await _db.Animais.AnyAsync(a => a.Brinco == dto.Brinco.ToUpper());
        if (brincoExiste)
            return Conflict(new { sucesso = false, mensagem = $"Já existe um animal com o brinco {dto.Brinco}." });

        var animal = new Animal
        {
            Brinco = dto.Brinco.ToUpper(),
            Nome = dto.Nome?.Trim(),
            Raca = dto.Raca.Trim(),
            Sexo = dto.Sexo,
            Tipo = dto.Tipo.Trim(),
            StatusLeite = dto.Sexo == "F" ? dto.StatusLeite : "N/A",
            Ativo = true,
            PropriedadeId = dto.PropriedadeId
        };

        _db.Animais.Add(animal);
        await _db.SaveChangesAsync();

        return Ok(new { sucesso = true, mensagem = "Animal cadastrado com sucesso!", id = animal.Id });
    }

    // PUT /api/animais/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] CadastrarAnimalDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Raca) || string.IsNullOrWhiteSpace(dto.Tipo))
            return BadRequest(new { sucesso = false, mensagem = "Raça e Tipo são obrigatórios." });

        var animal = await _db.Animais.FindAsync(id);
        if (animal is null)
            return NotFound(new { sucesso = false, mensagem = "Animal não encontrado." });

        animal.Nome = dto.Nome?.Trim();
        animal.Raca = dto.Raca.Trim();
        animal.Sexo = dto.Sexo;
        animal.Tipo = dto.Tipo.Trim();
        animal.StatusLeite = dto.Sexo == "F" ? dto.StatusLeite : "N/A";

        await _db.SaveChangesAsync();
        return Ok(new { sucesso = true, mensagem = "Animal atualizado com sucesso!" });
    }

    // DELETE /api/animais/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Excluir(int id)
    {
        var animal = await _db.Animais.FindAsync(id);
        if (animal is null)
            return NotFound(new { sucesso = false, mensagem = "Animal não encontrado." });

        _db.Animais.Remove(animal);
        await _db.SaveChangesAsync();
        return Ok(new { sucesso = true, mensagem = "Animal excluído com sucesso!" });
    }
}
