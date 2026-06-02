using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class AfastamentoService(AppDbContext db)
{
    private readonly AppDbContext _db = db;

    public async Task<List<AfastamentoResponseDto>> ListarAsync(int propriedadeId)
    {
        var hoje = DateTime.Today;

        return await _db.Afastamentos
            .Include(a => a.Animal)
            .Where(a => a.PropriedadeId == propriedadeId)
            .OrderByDescending(a => a.DataAfastamento)
            .Select(a => new AfastamentoResponseDto
            {
                Id = a.Id,
                AnimalId = a.AnimalId,
                AnimalNome = a.Animal.Nome ?? a.Animal.Brinco,
                AnimalBrinco = a.Animal.Brinco,
                MotivoAfastamento = a.MotivoAfastamento,
                DataAfastamento = a.DataAfastamento,
                ProdutoUtilizado = a.ProdutoUtilizado,
                PeriodoCarencia = a.PeriodoCarencia,
                DataRetorno = a.DataRetorno,
                Observacao = a.Observacao,
                Ativo = a.DataRetorno == null || a.DataRetorno > hoje,
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarAsync(CadastrarAfastamentoDto dto)
    {
        var animal = await _db.Animais
            .FirstOrDefaultAsync(a => a.Id == dto.AnimalId && a.PropriedadeId == dto.PropriedadeId);

        if (animal is null)
            return (false, "Animal não encontrado nesta propriedade.", null);

        var afastamento = new Afastamento
        {
            AnimalId = dto.AnimalId,
            PropriedadeId = dto.PropriedadeId,
            MotivoAfastamento = dto.MotivoAfastamento.Trim(),
            DataAfastamento = dto.DataAfastamento,
            ProdutoUtilizado = dto.ProdutoUtilizado?.Trim(),
            PeriodoCarencia = dto.PeriodoCarencia,
            DataRetorno = dto.DataRetorno,
            Observacao = dto.Observacao?.Trim(),
        };

        _db.Afastamentos.Add(afastamento);
        await _db.SaveChangesAsync();
        return (true, "Afastamento registrado com sucesso!", afastamento.Id);
    }

    public async Task<(bool Sucesso, string Mensagem)> AtualizarAsync(int id, int propriedadeId, AtualizarAfastamentoDto dto)
    {
        var afastamento = await _db.Afastamentos
            .FirstOrDefaultAsync(a => a.Id == id && a.PropriedadeId == propriedadeId);

        if (afastamento is null)
            return (false, "Afastamento não encontrado.");

        afastamento.ProdutoUtilizado = dto.ProdutoUtilizado?.Trim();
        afastamento.PeriodoCarencia = dto.PeriodoCarencia;
        afastamento.DataRetorno = dto.DataRetorno;
        afastamento.Observacao = dto.Observacao?.Trim();

        await _db.SaveChangesAsync();
        return (true, "Afastamento atualizado com sucesso!");
    }

    public async Task<(bool Sucesso, string Mensagem)> ExcluirAsync(int id, int propriedadeId)
    {
        var afastamento = await _db.Afastamentos
            .FirstOrDefaultAsync(a => a.Id == id && a.PropriedadeId == propriedadeId);

        if (afastamento is null)
            return (false, "Afastamento não encontrado.");

        _db.Afastamentos.Remove(afastamento);
        await _db.SaveChangesAsync();
        return (true, "Afastamento removido com sucesso!");
    }
}
