using Microsoft.EntityFrameworkCore;
using AgroControl.API.Data;
using AgroControl.API.DTOs;

namespace AgroControl.API.Services;

public class RelatorioService(AppDbContext db)
{
    private readonly AppDbContext _db = db;

    private static (DateTime Inicio, DateTime Fim) NormalizarPeriodo(DateTime? dataInicio, DateTime? dataFim)
    {
        var hoje = DateTime.Today;
        var inicio = dataInicio?.Date ?? new DateTime(hoje.Year, hoje.Month, 1);
        var fim = (dataFim?.Date ?? hoje).AddDays(1).AddSeconds(-1);
        return (inicio, fim);
    }

    public async Task<RelatorioProdutividadeDto> ProdutividadeAsync(
        int propriedadeId, DateTime? dataInicio = null, DateTime? dataFim = null)
    {
        var (inicio, fim) = NormalizarPeriodo(dataInicio, dataFim);

        var animais = await _db.Animais
            .Where(a => a.PropriedadeId == propriedadeId
                     && a.Ativo
                     && (a.DataEntrada == null || a.DataEntrada <= fim)
                     && (a.DataSaida == null || a.DataSaida >= inicio))
            .ToListAsync();

        return new RelatorioProdutividadeDto
        {
            TotalAnimaisAtivos = animais.Count,
            TotalMachos = animais.Count(a => a.Sexo == "M"),
            TotalFemeas = animais.Count(a => a.Sexo == "F"),
            PorRaca = animais.GroupBy(a => a.Raca)
                             .ToDictionary(g => g.Key, g => g.Count()),
            PorTipo = animais.GroupBy(a => a.Tipo)
                             .ToDictionary(g => g.Key, g => g.Count()),
            PorStatusLeite = animais.Where(a => a.Sexo == "F")
                                    .GroupBy(a => a.StatusLeite)
                                    .ToDictionary(g => g.Key, g => g.Count()),
        };
    }

    public async Task<RelatorioSanitarioDto> SanitarioAsync(
        int propriedadeId, DateTime? dataInicio = null, DateTime? dataFim = null)
    {
        var (inicio, fim) = NormalizarPeriodo(dataInicio, dataFim);
        var hoje = DateTime.Today;

        var afastamentos = await _db.Afastamentos
            .Include(a => a.Animal)
            .Where(a => a.PropriedadeId == propriedadeId
                     && a.DataAfastamento >= inicio
                     && a.DataAfastamento <= fim)
            .OrderByDescending(a => a.DataAfastamento)
            .ToListAsync();

        var ativos = afastamentos.Where(a => a.DataRetorno == null || a.DataRetorno > hoje).ToList();

        return new RelatorioSanitarioDto
        {
            TotalAfastamentos = afastamentos.Count,
            AfastamentosAtivos = ativos.Count,
            PorMotivo = afastamentos.GroupBy(a => a.MotivoAfastamento)
                                    .ToDictionary(g => g.Key, g => g.Count()),
            UltimosAfastamentos = afastamentos.Take(20).Select(a => new AfastamentoResponseDto
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
            }).ToList(),
        };
    }

    public async Task<RelatorioFinanceiroDto> FinanceiroAsync(
        int propriedadeId, DateTime? dataInicio = null, DateTime? dataFim = null)
    {
        var (inicio, fim) = NormalizarPeriodo(dataInicio, dataFim);

        var receitas = await _db.Receitas
            .Where(r => r.PropriedadeId == propriedadeId
                     && r.DataReceita >= inicio && r.DataReceita <= fim)
            .SumAsync(r => (decimal?)r.Valor) ?? 0;

        var despesas = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId
                     && d.DataDespesa >= inicio && d.DataDespesa <= fim)
            .SumAsync(d => (decimal?)d.Valor) ?? 0;

        var categorias = await _db.Despesas
            .Where(d => d.PropriedadeId == propriedadeId
                     && d.DataDespesa >= inicio && d.DataDespesa <= fim)
            .GroupBy(d => d.Categoria)
            .Select(g => new { Categoria = g.Key, Total = g.Sum(d => d.Valor) })
            .ToListAsync();

        var totalCat = categorias.Sum(c => c.Total);

        var lucro = receitas - despesas;
        var margem = receitas > 0
            ? Math.Round((double)(lucro / receitas * 100), 1)
            : 0;

        // Evolução mês a mês dentro do período
        var mesesNoIntervalo = ((fim.Year - inicio.Year) * 12) + fim.Month - inicio.Month + 1;
        mesesNoIntervalo = Math.Clamp(mesesNoIntervalo, 1, 12);
        var evolucao = new List<EvolucaoMensalDto>();
        for (int i = 0; i < mesesNoIntervalo; i++)
        {
            var mesRef = inicio.AddMonths(i);
            var mInicio = new DateTime(mesRef.Year, mesRef.Month, 1);
            var mFim = mInicio.AddMonths(1).AddDays(-1);
            var r = await _db.Receitas
                .Where(x => x.PropriedadeId == propriedadeId && x.DataReceita >= mInicio && x.DataReceita <= mFim)
                .SumAsync(x => (decimal?)x.Valor) ?? 0;
            var d = await _db.Despesas
                .Where(x => x.PropriedadeId == propriedadeId && x.DataDespesa >= mInicio && x.DataDespesa <= mFim)
                .SumAsync(x => (decimal?)x.Valor) ?? 0;
            evolucao.Add(new EvolucaoMensalDto
            {
                Mes = mesRef.ToString("MMM", new System.Globalization.CultureInfo("pt-BR")),
                Receita = r,
                Despesa = d,
            });
        }

        return new RelatorioFinanceiroDto
        {
            ReceitaTotal = receitas,
            DespesaTotal = despesas,
            Lucro = lucro,
            MargemLucro = margem,
            EvolucaoMensal = evolucao,
            DespesasPorCategoria = categorias
                .OrderByDescending(c => c.Total)
                .Select(c => new DespesaCategoriaDto
                {
                    Categoria = c.Categoria,
                    Total = c.Total,
                    Percentual = totalCat > 0 ? Math.Round((double)(c.Total / totalCat * 100), 1) : 0,
                }).ToList(),
        };
    }

    public Task<RelatorioReprodutivoDto> ReprodutivoAsync(
        int propriedadeId, DateTime? dataInicio = null, DateTime? dataFim = null)
    {
        return Task.FromResult(new RelatorioReprodutivoDto
        {
            TotalGestantes = 0,
            TotalPartos = 0,
            TaxaNatalidade = 0,
            Mensagem = "Módulo reprodutivo disponível em breve (requer tabela REPRODUCAO).",
        });
    }
}
