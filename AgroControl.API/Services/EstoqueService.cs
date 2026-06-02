using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class EstoqueService
{
    private readonly AppDbContext _db;

    public EstoqueService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<EstoqueMedicamentoResponseDto>> ListarAsync(int propriedadeId)
    {
        return await _db.EstoqueMedicamentos
            .Where(e => e.PropriedadeId == propriedadeId)
            .OrderBy(e => e.Tipo)
            .ThenBy(e => e.Nome)
            .Select(e => new EstoqueMedicamentoResponseDto
            {
                Id = e.Id,
                PropriedadeId = e.PropriedadeId,
                Nome = e.Nome,
                Tipo = e.Tipo,
                Unidade = e.Unidade,
                QuantidadeAtual = e.QuantidadeAtual,
                QuantidadeMinima = e.QuantidadeMinima,
                ValorUnitario = e.ValorUnitario,
                Observacao = e.Observacao
            })
            .ToListAsync();
    }

    public async Task<(bool Sucesso, string Mensagem, int? Id)> CadastrarAsync(CadastrarEstoqueDto dto)
    {
        var medicamento = new EstoqueMedicamento
        {
            PropriedadeId = dto.PropriedadeId,
            Nome = dto.Nome.Trim(),
            Tipo = dto.Tipo.Trim(),
            Unidade = dto.Unidade.Trim(),
            QuantidadeAtual = dto.QuantidadeInicial,
            QuantidadeMinima = dto.QuantidadeMinima,
            ValorUnitario = dto.ValorUnitario,
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        };

        _db.EstoqueMedicamentos.Add(medicamento);

        if (dto.QuantidadeInicial > 0)
        {
            _db.EstoqueMovimentacoes.Add(new EstoqueMovimentacao
            {
                Estoque = medicamento,
                TipoMovimentacao = "entrada",
                Quantidade = dto.QuantidadeInicial,
                Motivo = "Estoque inicial",
                DataMovimentacao = DateTime.Today
            });
        }

        await _db.SaveChangesAsync();
        return (true, "Medicamento cadastrado com sucesso!", medicamento.Id);
    }

    public async Task<(bool Sucesso, string Mensagem)> AtualizarAsync(int id, int propriedadeId, AtualizarEstoqueDto dto)
    {
        var medicamento = await _db.EstoqueMedicamentos
            .FirstOrDefaultAsync(e => e.Id == id && e.PropriedadeId == propriedadeId);

        if (medicamento is null)
            return (false, "Medicamento não encontrado.");

        if (!string.IsNullOrWhiteSpace(dto.Nome)) medicamento.Nome = dto.Nome.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Tipo)) medicamento.Tipo = dto.Tipo.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Unidade)) medicamento.Unidade = dto.Unidade.Trim();
        if (dto.QuantidadeMinima.HasValue) medicamento.QuantidadeMinima = dto.QuantidadeMinima;
        if (dto.ValorUnitario.HasValue) medicamento.ValorUnitario = dto.ValorUnitario;
        if (dto.Observacao is not null) medicamento.Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim();
        medicamento.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        return (true, "Medicamento atualizado com sucesso!");
    }

    public async Task<(bool Sucesso, string Mensagem)> ExcluirAsync(int id, int propriedadeId)
    {
        var medicamento = await _db.EstoqueMedicamentos
            .FirstOrDefaultAsync(e => e.Id == id && e.PropriedadeId == propriedadeId);

        if (medicamento is null)
            return (false, "Medicamento não encontrado.");

        _db.EstoqueMedicamentos.Remove(medicamento);
        await _db.SaveChangesAsync();
        return (true, "Medicamento removido com sucesso!");
    }

    public async Task<(bool Sucesso, string Mensagem)> RegistrarEntradaAsync(int id, int propriedadeId, EntradaEstoqueDto dto)
    {
        var medicamento = await _db.EstoqueMedicamentos
            .FirstOrDefaultAsync(e => e.Id == id && e.PropriedadeId == propriedadeId);

        if (medicamento is null)
            return (false, "Medicamento não encontrado.");

        medicamento.QuantidadeAtual += dto.Quantidade;
        medicamento.UpdatedAt = DateTime.Now;

        _db.EstoqueMovimentacoes.Add(new EstoqueMovimentacao
        {
            EstoqueId = id,
            TipoMovimentacao = "entrada",
            Quantidade = dto.Quantidade,
            Motivo = string.IsNullOrWhiteSpace(dto.Motivo) ? "Compra" : dto.Motivo.Trim(),
            DataMovimentacao = dto.DataMovimentacao,
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        });

        await _db.SaveChangesAsync();
        return (true, "Entrada registrada com sucesso!");
    }

    public async Task<(bool Sucesso, string Mensagem)> RegistrarSaidaAsync(int id, int propriedadeId, SaidaEstoqueDto dto)
    {
        var medicamento = await _db.EstoqueMedicamentos
            .FirstOrDefaultAsync(e => e.Id == id && e.PropriedadeId == propriedadeId);

        if (medicamento is null)
            return (false, "Medicamento não encontrado.");

        if (medicamento.QuantidadeAtual < dto.Quantidade)
            return (false, $"Quantidade insuficiente em estoque. Disponível: {medicamento.QuantidadeAtual} {medicamento.Unidade}.");

        medicamento.QuantidadeAtual -= dto.Quantidade;
        medicamento.UpdatedAt = DateTime.Now;

        _db.EstoqueMovimentacoes.Add(new EstoqueMovimentacao
        {
            EstoqueId = id,
            TipoMovimentacao = "saida",
            Quantidade = dto.Quantidade,
            Motivo = string.IsNullOrWhiteSpace(dto.Motivo) ? "Aplicacao" : dto.Motivo.Trim(),
            AnimalId = dto.AnimalId,
            DataMovimentacao = dto.DataMovimentacao,
            Observacao = string.IsNullOrWhiteSpace(dto.Observacao) ? null : dto.Observacao.Trim()
        });

        await _db.SaveChangesAsync();
        return (true, "Saída registrada com sucesso!");
    }

    public async Task<List<EstoqueMedicamentoResponseDto>> AlertasAsync(int propriedadeId)
    {
        return await _db.EstoqueMedicamentos
            .Where(e => e.PropriedadeId == propriedadeId &&
                        e.QuantidadeMinima.HasValue &&
                        e.QuantidadeAtual <= e.QuantidadeMinima.Value)
            .OrderBy(e => e.QuantidadeAtual)
            .Select(e => new EstoqueMedicamentoResponseDto
            {
                Id = e.Id,
                PropriedadeId = e.PropriedadeId,
                Nome = e.Nome,
                Tipo = e.Tipo,
                Unidade = e.Unidade,
                QuantidadeAtual = e.QuantidadeAtual,
                QuantidadeMinima = e.QuantidadeMinima,
                ValorUnitario = e.ValorUnitario,
                Observacao = e.Observacao
            })
            .ToListAsync();
    }

    public async Task<List<EstoqueMovimentacaoResponseDto>> ListarMovimentacoesAsync(int propriedadeId)
    {
        return await _db.EstoqueMovimentacoes
            .Where(m => m.Estoque.PropriedadeId == propriedadeId)
            .OrderByDescending(m => m.DataMovimentacao)
            .ThenByDescending(m => m.Id)
            .Select(m => new EstoqueMovimentacaoResponseDto
            {
                Id = m.Id,
                EstoqueId = m.EstoqueId,
                NomeMedicamento = m.Estoque.Nome,
                TipoMovimentacao = m.TipoMovimentacao,
                Quantidade = m.Quantidade,
                Motivo = m.Motivo,
                AnimalId = m.AnimalId,
                AnimalNome = m.Animal != null ? m.Animal.Nome : null,
                DataMovimentacao = m.DataMovimentacao,
                Observacao = m.Observacao,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }
}
