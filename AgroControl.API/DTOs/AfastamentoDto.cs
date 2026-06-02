using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class AfastamentoResponseDto
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string AnimalNome { get; set; } = string.Empty;
    public string AnimalBrinco { get; set; } = string.Empty;
    public string MotivoAfastamento { get; set; } = string.Empty;
    public DateTime DataAfastamento { get; set; }
    public string? ProdutoUtilizado { get; set; }
    public int? PeriodoCarencia { get; set; }
    public DateTime? DataRetorno { get; set; }
    public string? Observacao { get; set; }
    public bool Ativo { get; set; }
}

public class CadastrarAfastamentoDto
{
    [Required(ErrorMessage = "animalId é obrigatório")]
    public int AnimalId { get; set; }

    [Required(ErrorMessage = "propriedadeId é obrigatório")]
    public int PropriedadeId { get; set; }

    [Required(ErrorMessage = "Motivo é obrigatório")]
    [MaxLength(100)]
    public string MotivoAfastamento { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data de afastamento é obrigatória")]
    public DateTime DataAfastamento { get; set; }

    [MaxLength(100)]
    public string? ProdutoUtilizado { get; set; }

    public int? PeriodoCarencia { get; set; }

    public DateTime? DataRetorno { get; set; }

    [MaxLength(255)]
    public string? Observacao { get; set; }
}

public class AtualizarAfastamentoDto
{
    [MaxLength(100)]
    public string? ProdutoUtilizado { get; set; }

    public int? PeriodoCarencia { get; set; }

    public DateTime? DataRetorno { get; set; }

    [MaxLength(255)]
    public string? Observacao { get; set; }
}
