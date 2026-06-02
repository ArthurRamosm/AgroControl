using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class EstoqueMedicamentoResponseDto
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Unidade { get; set; } = string.Empty;
    public decimal QuantidadeAtual { get; set; }
    public decimal? QuantidadeMinima { get; set; }
    public decimal? ValorUnitario { get; set; }
    public string? Observacao { get; set; }
    public bool EstoqueBaixo => QuantidadeMinima.HasValue && QuantidadeAtual <= QuantidadeMinima.Value;
}

public class CadastrarEstoqueDto
{
    [Required]
    public int PropriedadeId { get; set; }

    [Required(ErrorMessage = "Nome é obrigatório")]
    [MaxLength(100)]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tipo é obrigatório")]
    [MaxLength(20)]
    public string Tipo { get; set; } = string.Empty;

    [Required(ErrorMessage = "Unidade é obrigatória")]
    [MaxLength(20)]
    public string Unidade { get; set; } = string.Empty;

    public decimal QuantidadeInicial { get; set; }
    public decimal? QuantidadeMinima { get; set; }
    public decimal? ValorUnitario { get; set; }

    [MaxLength(255)]
    public string? Observacao { get; set; }
}

public class AtualizarEstoqueDto
{
    [MaxLength(100)]
    public string? Nome { get; set; }

    [MaxLength(20)]
    public string? Tipo { get; set; }

    [MaxLength(20)]
    public string? Unidade { get; set; }

    public decimal? QuantidadeMinima { get; set; }
    public decimal? ValorUnitario { get; set; }

    [MaxLength(255)]
    public string? Observacao { get; set; }
}

public class EntradaEstoqueDto
{
    [Range(0.01, double.MaxValue, ErrorMessage = "Quantidade deve ser maior que zero")]
    public decimal Quantidade { get; set; }

    [MaxLength(100)]
    public string? Motivo { get; set; }

    [Required]
    public DateTime DataMovimentacao { get; set; }

    [MaxLength(255)]
    public string? Observacao { get; set; }
}

public class SaidaEstoqueDto
{
    [Range(0.01, double.MaxValue, ErrorMessage = "Quantidade deve ser maior que zero")]
    public decimal Quantidade { get; set; }

    [MaxLength(100)]
    public string? Motivo { get; set; }

    public int? AnimalId { get; set; }

    [Required]
    public DateTime DataMovimentacao { get; set; }

    [MaxLength(255)]
    public string? Observacao { get; set; }
}

public class EstoqueMovimentacaoResponseDto
{
    public int Id { get; set; }
    public int EstoqueId { get; set; }
    public string NomeMedicamento { get; set; } = string.Empty;
    public string TipoMovimentacao { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public string? Motivo { get; set; }
    public int? AnimalId { get; set; }
    public string? AnimalNome { get; set; }
    public DateTime DataMovimentacao { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class EstatisticasSaudeDto
{
    public int VacinasEsteMes { get; set; }
    public int VermifugacoesEsteMes { get; set; }
    public int TratamentosAtivos { get; set; }
    public int AnimaisAfastados { get; set; }
    public int ProximasVacinas { get; set; }
}
