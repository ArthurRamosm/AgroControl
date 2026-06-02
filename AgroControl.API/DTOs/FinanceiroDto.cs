using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class ResumoFinanceiroDto
{
    public decimal ReceitaTotal { get; set; }
    public decimal DespesaTotal { get; set; }
    public decimal LucroLiquido { get; set; }
    public double MargemLucro { get; set; }
    public double Roi { get; set; }
    public double VariacaoReceitaMes { get; set; }
    public double VariacaoDespesaMes { get; set; }
    public double VariacaoLucroMes { get; set; }
}

public class EvolucaoMensalDto
{
    public string Mes { get; set; } = string.Empty;
    public decimal Receita { get; set; }
    public decimal Despesa { get; set; }
    public decimal Lucro { get; set; }
}

public class DespesaCategoriaDto
{
    public string Categoria { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public double Percentual { get; set; }
}

public class CustoPorAnimalDto
{
    public int TotalAnimaisAtivos { get; set; }
    public decimal CustoPorCabeca { get; set; }
    public string Mes { get; set; } = string.Empty;
}

public class CustoAnimalEspecificoDto
{
    public int AnimalId { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public decimal TotalDespesas { get; set; }
    public DateTime? UltimaDespesa { get; set; }
}

public class AlertaFinanceiroDto
{
    public string Tipo { get; set; } = string.Empty;
    public string Mensagem { get; set; } = string.Empty;
    public string Urgencia { get; set; } = "baixa";
}

public class CadastrarDespesaDto
{
    [Required(ErrorMessage = "propriedadeId é obrigatório")]
    public int PropriedadeId { get; set; }

    public int? AnimalId { get; set; }

    [Required(ErrorMessage = "Categoria é obrigatória")]
    [MaxLength(50)]
    public string Categoria { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Descricao { get; set; }

    [Required(ErrorMessage = "Valor é obrigatório")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Valor deve ser maior que zero")]
    public decimal Valor { get; set; }

    [Required(ErrorMessage = "Data da despesa é obrigatória")]
    public DateTime DataDespesa { get; set; }
}

public class CadastrarReceitaDto
{
    [Required(ErrorMessage = "propriedadeId é obrigatório")]
    public int PropriedadeId { get; set; }

    public int? AnimalId { get; set; }

    [MaxLength(50)]
    public string Tipo { get; set; } = "Outros";

    [MaxLength(255)]
    public string? Descricao { get; set; }

    [Required(ErrorMessage = "Valor é obrigatório")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Valor deve ser maior que zero")]
    public decimal Valor { get; set; }

    [Required(ErrorMessage = "Data da receita é obrigatória")]
    public DateTime DataReceita { get; set; }
}
