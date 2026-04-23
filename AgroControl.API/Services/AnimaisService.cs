using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class AnimaisService
{
    private readonly AppDbContext _db;

    public AnimaisService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<AnimalResponseDto>> ListarAsync(int propriedadeId)
    {
        return await _db.Animais
            .Where(a => a.PropriedadeId == propriedadeId)
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
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarAsync(CadastrarAnimalDto dto)
    {
        var brincoExiste = await _db.Animais.AnyAsync(a => a.Brinco == dto.Brinco.ToUpper());
        if (brincoExiste)
            return (false, $"Já existe um animal com o brinco {dto.Brinco.ToUpper()}.", null);

        var animal = new Animal
        {
            Brinco = dto.Brinco.ToUpper(),
            Nome = string.IsNullOrWhiteSpace(dto.Nome) ? null : dto.Nome.Trim(),
            Raca = dto.Raca.Trim(),
            Sexo = dto.Sexo,
            Tipo = dto.Tipo.Trim(),
            StatusLeite = dto.Sexo == "F" ? dto.StatusLeite : "N/A",
            Ativo = true,
            PropriedadeId = dto.PropriedadeId
        };

        _db.Animais.Add(animal);
        await _db.SaveChangesAsync();
        return (true, "Animal cadastrado com sucesso!", animal.Id);
    }

    public async Task<(bool Sucesso, string Mensagem)> AtualizarAsync(int id, int propriedadeId, CadastrarAnimalDto dto)
    {
        var animal = await _db.Animais
            .FirstOrDefaultAsync(a => a.Id == id && a.PropriedadeId == propriedadeId);

        if (animal is null)
            return (false, "Animal não encontrado ou não pertence à sua propriedade.");

        animal.Nome = string.IsNullOrWhiteSpace(dto.Nome) ? null : dto.Nome.Trim();
        animal.Raca = dto.Raca.Trim();
        animal.Sexo = dto.Sexo;
        animal.Tipo = dto.Tipo.Trim();
        animal.StatusLeite = dto.Sexo == "F" ? dto.StatusLeite : "N/A";

        await _db.SaveChangesAsync();
        return (true, "Animal atualizado com sucesso!");
    }

    public async Task<(bool Sucesso, string Mensagem)> ExcluirAsync(int id, int propriedadeId)
    {
        var animal = await _db.Animais
            .FirstOrDefaultAsync(a => a.Id == id && a.PropriedadeId == propriedadeId);

        if (animal is null)
            return (false, "Animal não encontrado ou não pertence à sua propriedade.");

        _db.Animais.Remove(animal);
        await _db.SaveChangesAsync();
        return (true, "Animal excluído com sucesso!");
    }
}
