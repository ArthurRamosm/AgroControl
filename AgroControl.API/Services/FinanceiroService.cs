using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;
using AgroControl.API.Models;

namespace AgroControl.API.Services;

public class FinanceiroService(AppDbContext db)
{
    private readonly AppDbContext _db = db;

    public async Task<ResumoFinanceiroDto> ObterResumoAsync(int propriedadeId)
    {
        var hoje = DateTime.Today;
        var inicioMes = new DateTime(hoje.Year, hoje.Month, 1);
        var inicioMesAnterior = inicioMes.AddMonths(-1);
        var fimMesAnterior = inicioMes.AddDays(-1);

        var receitaMes = await _db.Receitas
            .Where(r => r.PropriedadeId == propriedadeId && r.DataReceita >= inicioMes)
            .SumAsync(r => (decimal?)r.Valor) ?? 0;

        var despesaMes = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId && d.DataDespesa >= inicioMes)
            .SumAsync(d => (decimal?)d.Valor) ?? 0;

        var receitaAnterior = await _db.Receitas
            .Where(r => r.PropriedadeId == propriedadeId
                     && r.DataReceita >= inicioMesAnterior
                     && r.DataReceita <= fimMesAnterior)
            .SumAsync(r => (decimal?)r.Valor) ?? 0;

        var despesaAnterior = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId
                     && d.DataDespesa >= inicioMesAnterior
                     && d.DataDespesa <= fimMesAnterior)
            .SumAsync(d => (decimal?)d.Valor) ?? 0;

        var lucroMes = receitaMes - despesaMes;
        var lucroAnterior = receitaAnterior - despesaAnterior;

        double varReceita = receitaAnterior > 0
            ? (double)((receitaMes - receitaAnterior) / receitaAnterior * 100) : 0;

        double varDespesa = despesaAnterior > 0
            ? (double)((despesaMes - despesaAnterior) / despesaAnterior * 100) : 0;

        double varLucro = lucroAnterior != 0
            ? (double)((lucroMes - lucroAnterior) / Math.Abs(lucroAnterior) * 100) : 0;

        double margemLucro = receitaMes > 0
            ? (double)(lucroMes / receitaMes * 100) : 0;

        return new ResumoFinanceiroDto
        {
            ReceitaTotal = receitaMes,
            DespesaTotal = despesaMes,
            LucroLiquido = lucroMes,
            MargemLucro = Math.Round(margemLucro, 1),
            Roi = Math.Round(margemLucro, 1),
            VariacaoReceitaMes = Math.Round(varReceita, 1),
            VariacaoDespesaMes = Math.Round(varDespesa, 1),
            VariacaoLucroMes = Math.Round(varLucro, 1),
        };
    }

    public async Task<List<EvolucaoMensalDto>> ObterEvolucaoAsync(int propriedadeId, int meses = 3)
    {
        meses = Math.Clamp(meses, 1, 12);
        var hoje = DateTime.Today;
        var resultado = new List<EvolucaoMensalDto>();

        for (int i = meses - 1; i >= 0; i--)
        {
            var mes = hoje.AddMonths(-i);
            var inicio = new DateTime(mes.Year, mes.Month, 1);
            var fim = inicio.AddMonths(1).AddDays(-1);

            var receita = await _db.Receitas
                .Where(r => r.PropriedadeId == propriedadeId
                         && r.DataReceita >= inicio && r.DataReceita <= fim)
                .SumAsync(r => (decimal?)r.Valor) ?? 0;

            var despesa = await _db.Despesas
                .Where(d => d.PropriedadeId == propriedadeId
                         && d.DataDespesa >= inicio && d.DataDespesa <= fim)
                .SumAsync(d => (decimal?)d.Valor) ?? 0;

            resultado.Add(new EvolucaoMensalDto
            {
                Mes = mes.ToString("MMM", new System.Globalization.CultureInfo("pt-BR")),
                Receita = receita,
                Despesa = despesa,
                Lucro = receita - despesa,
            });
        }

        return resultado;
    }

    public async Task<List<DespesaCategoriaDto>> ObterDespesasPorCategoriaAsync(int propriedadeId)
    {
        var hoje = DateTime.Today;
        var inicioMes = new DateTime(hoje.Year, hoje.Month, 1);

        var grupos = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId && d.DataDespesa >= inicioMes)
            .GroupBy(d => d.Categoria)
            .Select(g => new { Categoria = g.Key, Total = g.Sum(d => d.Valor) })
            .ToListAsync();

        var totalGeral = grupos.Sum(g => g.Total);

        return grupos
            .OrderByDescending(g => g.Total)
            .Select(g => new DespesaCategoriaDto
            {
                Categoria = g.Categoria,
                Total = g.Total,
                Percentual = totalGeral > 0
                    ? Math.Round((double)(g.Total / totalGeral * 100), 1) : 0,
            })
            .ToList();
    }

    public async Task<CustoPorAnimalDto> ObterCustoPorAnimalAsync(int propriedadeId, string? mes = null)
    {
        DateTime inicio;
        if (!string.IsNullOrWhiteSpace(mes) &&
            DateTime.TryParse(mes + "-01", out var parsedMes))
            inicio = new DateTime(parsedMes.Year, parsedMes.Month, 1);
        else
        {
            var hoje = DateTime.Today;
            inicio = new DateTime(hoje.Year, hoje.Month, 1);
        }
        var fim = inicio.AddMonths(1).AddDays(-1);

        var totalAnimais = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId && a.Ativo);

        var totalDespesas = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId
                     && d.DataDespesa >= inicio && d.DataDespesa <= fim)
            .SumAsync(d => (decimal?)d.Valor) ?? 0;

        return new CustoPorAnimalDto
        {
            TotalAnimaisAtivos = totalAnimais,
            CustoPorCabeca = totalAnimais > 0
                ? Math.Round(totalDespesas / totalAnimais, 2) : 0,
            Mes = inicio.ToString("yyyy-MM"),
        };
    }

    public async Task<CustoAnimalEspecificoDto?> ObterCustoAnimalEspecificoAsync(
        int propriedadeId, int animalId)
    {
        var animal = await _db.Animais
            .FirstOrDefaultAsync(a => a.Id == animalId && a.PropriedadeId == propriedadeId);
        if (animal is null) return null;

        var despesas = await _db.Despesas
            .Where(d => d.AnimalId == animalId)
            .ToListAsync();

        return new CustoAnimalEspecificoDto
        {
            AnimalId = animal.Id,
            Brinco = animal.Brinco,
            Nome = animal.Nome,
            TotalDespesas = despesas.Sum(d => d.Valor),
            UltimaDespesa = despesas.Count > 0
                ? despesas.Max(d => d.DataDespesa) : null,
        };
    }

    public async Task<List<AlertaFinanceiroDto>> ObterAlertasAsync(int propriedadeId)
    {
        var alertas = new List<AlertaFinanceiroDto>();
        var hoje = DateTime.Today;
        var inicioMes = new DateTime(hoje.Year, hoje.Month, 1);
        var inicioMesAnterior = inicioMes.AddMonths(-1);
        var fimMesAnterior = inicioMes.AddDays(-1);

        var despesasMes = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId && d.DataDespesa >= inicioMes)
            .GroupBy(d => d.Categoria)
            .Select(g => new { Categoria = g.Key, Total = g.Sum(d => d.Valor) })
            .ToListAsync();

        var despesasAnterior = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId
                     && d.DataDespesa >= inicioMesAnterior
                     && d.DataDespesa <= fimMesAnterior)
            .GroupBy(d => d.Categoria)
            .Select(g => new { Categoria = g.Key, Total = g.Sum(d => d.Valor) })
            .ToListAsync();

        foreach (var cat in despesasMes)
        {
            var anterior = despesasAnterior.FirstOrDefault(d => d.Categoria == cat.Categoria);
            if (anterior is null || anterior.Total <= 0) continue;

            var variacao = (double)((cat.Total - anterior.Total) / anterior.Total * 100);
            if (variacao > 15)
            {
                alertas.Add(new AlertaFinanceiroDto
                {
                    Tipo = "CategoriaAumento",
                    Mensagem = $"{cat.Categoria} aumentou {variacao:F0}% este mês",
                    Urgencia = variacao > 30 ? "alta" : "media",
                });
            }
        }

        // Animais sem movimentação financeira há 90 dias
        var limite90 = hoje.AddDays(-90);
        var totalAtivos = await _db.Animais
            .CountAsync(a => a.PropriedadeId == propriedadeId && a.Ativo);

        var comMovimentacao = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId
                     && d.AnimalId.HasValue
                     && d.DataDespesa >= limite90)
            .Select(d => d.AnimalId!.Value)
            .Distinct()
            .CountAsync();

        var semMovimentacao = totalAtivos - comMovimentacao;
        if (semMovimentacao > 0)
        {
            alertas.Add(new AlertaFinanceiroDto
            {
                Tipo = "SemMovimentacao",
                Mensagem = $"{semMovimentacao} {(semMovimentacao == 1 ? "animal" : "animais")} sem movimentação financeira há 90 dias",
                Urgencia = "baixa",
            });
        }

        return alertas;
    }

    public async Task<(bool Sucesso, string Mensagem)> CadastrarDespesaAsync(CadastrarDespesaDto dto)
    {
        _db.Despesas.Add(new Despesa
        {
            PropriedadeId = dto.PropriedadeId,
            AnimalId = dto.AnimalId,
            Categoria = dto.Categoria.Trim(),
            Descricao = dto.Descricao?.Trim(),
            Valor = dto.Valor,
            DataDespesa = dto.DataDespesa,
        });
        await _db.SaveChangesAsync();
        return (true, "Despesa cadastrada com sucesso!");
    }

    public async Task<(bool Sucesso, string Mensagem)> CadastrarReceitaAsync(CadastrarReceitaDto dto)
    {
        _db.Receitas.Add(new Receita
        {
            PropriedadeId = dto.PropriedadeId,
            Tipo = dto.Tipo?.Trim() ?? "Outros",
            Descricao = dto.Descricao?.Trim(),
            Valor = dto.Valor,
            DataReceita = dto.DataReceita,
        });

        if (dto.Tipo == "VendaAnimais" && dto.AnimalId.HasValue)
        {
            var animal = await _db.Animais.FindAsync(dto.AnimalId.Value);
            if (animal is not null)
            {
                animal.Ativo = false;
                animal.DataSaida = dto.DataReceita;
                animal.MotivoSaida = "Vendido";
            }
        }

        await _db.SaveChangesAsync();
        return (true, "Receita cadastrada com sucesso!");
    }
}
