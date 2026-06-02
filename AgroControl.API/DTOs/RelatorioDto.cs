namespace AgroControl.API.DTOs;

public class RelatorioProdutividadeDto
{
    public int TotalAnimaisAtivos { get; set; }
    public int TotalMachos { get; set; }
    public int TotalFemeas { get; set; }
    public Dictionary<string, int> PorRaca { get; set; } = new();
    public Dictionary<string, int> PorTipo { get; set; } = new();
    public Dictionary<string, int> PorStatusLeite { get; set; } = new();
}

public class RelatorioSanitarioDto
{
    public int TotalAfastamentos { get; set; }
    public int AfastamentosAtivos { get; set; }
    public Dictionary<string, int> PorMotivo { get; set; } = new();
    public List<AfastamentoResponseDto> UltimosAfastamentos { get; set; } = new();
}

public class RelatorioFinanceiroDto
{
    public decimal ReceitaTotal { get; set; }
    public decimal DespesaTotal { get; set; }
    public decimal Lucro { get; set; }
    public double MargemLucro { get; set; }
    public List<EvolucaoMensalDto> EvolucaoMensal { get; set; } = new();
    public List<DespesaCategoriaDto> DespesasPorCategoria { get; set; } = new();
}

public class RelatorioReprodutivoDto
{
    public int TotalGestantes { get; set; }
    public int TotalPartos { get; set; }
    public double TaxaNatalidade { get; set; }
    public string Mensagem { get; set; } = string.Empty;
}
