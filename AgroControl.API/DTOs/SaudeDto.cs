using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class AnimalSaudeDto
{
    public int AnimalId { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public string Sexo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Raca { get; set; } = string.Empty;
    public string Idade { get; set; } = "Nao informada";
    public int? IdadeMeses { get; set; }
    public string Status { get; set; } = "Em dia";
    public List<string> VacinasPendentes { get; set; } = new();
    public List<string> VacinasAtrasadas { get; set; } = new();
    public List<string> AlertasVermifugacao { get; set; } = new();
}

public class RegistrarVacinaDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Animal e obrigatorio")]
    public int AnimalId { get; set; }

    [Required(ErrorMessage = "Nome da vacina e obrigatorio")]
    [MaxLength(100, ErrorMessage = "Nome da vacina pode ter no maximo 100 caracteres")]
    public string NomeVacina { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data de aplicacao e obrigatoria")]
    public DateTime DataAplicacao { get; set; }

    [MaxLength(50, ErrorMessage = "Dose pode ter no maximo 50 caracteres")]
    public string? Dose { get; set; }

    [MaxLength(500, ErrorMessage = "Observacao pode ter no maximo 500 caracteres")]
    public string? Observacao { get; set; }

    public DateTime? ProximaAplicacao { get; set; }

    // Integração financeira
    public bool RegistrarCustoFinanceiro { get; set; }
    public decimal? ValorCusto { get; set; }

    [MaxLength(255)]
    public string? DescricaoCusto { get; set; }

    // Desconto automático de estoque
    public int? EstoqueId { get; set; }
    public decimal? QuantidadeDescontar { get; set; }
}

public class AnimalVacinaResponseDto
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string NomeVacina { get; set; } = string.Empty;
    public DateTime DataAplicacao { get; set; }
    public string? Dose { get; set; }
    public string? Observacao { get; set; }
    public DateTime? ProximaAplicacao { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RegistrarSaudeRegistroDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Animal e obrigatorio")]
    public int AnimalId { get; set; }

    [Required(ErrorMessage = "Tipo do registro e obrigatorio")]
    [MaxLength(50, ErrorMessage = "Tipo do registro pode ter no maximo 50 caracteres")]
    public string TipoRegistro { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data do registro e obrigatoria")]
    public DateTime DataRegistro { get; set; }

    [MaxLength(255, ErrorMessage = "Descricao pode ter no maximo 255 caracteres")]
    public string? Descricao { get; set; }

    [MaxLength(100, ErrorMessage = "Produto utilizado pode ter no maximo 100 caracteres")]
    public string? ProdutoUtilizado { get; set; }

    [MaxLength(50, ErrorMessage = "Dose pode ter no maximo 50 caracteres")]
    public string? Dose { get; set; }

    [MaxLength(100, ErrorMessage = "Veterinario pode ter no maximo 100 caracteres")]
    public string? Veterinario { get; set; }

    public DateTime? ProximaAplicacao { get; set; }

    [MaxLength(500, ErrorMessage = "Observacao pode ter no maximo 500 caracteres")]
    public string? Observacao { get; set; }

    // Integração financeira
    public bool RegistrarCustoFinanceiro { get; set; }
    public decimal? ValorCusto { get; set; }

    [MaxLength(255)]
    public string? DescricaoCusto { get; set; }

    // Desconto automático de estoque
    public int? EstoqueId { get; set; }
    public decimal? QuantidadeDescontar { get; set; }
}

public class AnimalSaudeRegistroResponseDto
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string TipoRegistro { get; set; } = string.Empty;
    public DateTime DataRegistro { get; set; }
    public string? Descricao { get; set; }
    public string? ProdutoUtilizado { get; set; }
    public string? Dose { get; set; }
    public string? Veterinario { get; set; }
    public DateTime? ProximaAplicacao { get; set; }
    public string? Observacao { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LoteVacinaDto
{
    [Required]
    public List<int> AnimalIds { get; set; } = new();

    [Required]
    public int PropriedadeId { get; set; }

    [Required(ErrorMessage = "Nome da vacina e obrigatorio")]
    [MaxLength(100)]
    public string NomeVacina { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data de aplicacao e obrigatoria")]
    public DateTime DataAplicacao { get; set; }

    [MaxLength(50)]
    public string? Dose { get; set; }

    [MaxLength(500)]
    public string? Observacao { get; set; }
}

public class LoteVermifugacaoDto
{
    [Required]
    public List<int> AnimalIds { get; set; } = new();

    [Required]
    public int PropriedadeId { get; set; }

    [Required(ErrorMessage = "Produto e obrigatorio")]
    [MaxLength(100)]
    public string ProdutoUtilizado { get; set; } = string.Empty;

    [Required(ErrorMessage = "Data de aplicacao e obrigatoria")]
    public DateTime DataAplicacao { get; set; }

    [MaxLength(50)]
    public string? Dose { get; set; }

    [MaxLength(500)]
    public string? Observacao { get; set; }
}

public class LoteResultadoDto
{
    public bool Sucesso { get; set; }
    public int Registros { get; set; }
    public string Mensagem { get; set; } = string.Empty;
}

public class HistoricoVacinaDto
{
    public string AnimalNome { get; set; } = string.Empty;
    public string AnimalBrinco { get; set; } = string.Empty;
    public string NomeVacina { get; set; } = string.Empty;
    public DateTime DataAplicacao { get; set; }
    public string? Dose { get; set; }
    public string? Observacao { get; set; }
}
