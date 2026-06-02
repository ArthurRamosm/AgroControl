using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class CadastrarAnimalDto
{
    [Required(ErrorMessage = "Brinco é obrigatório")]
    [MaxLength(20, ErrorMessage = "Brinco pode ter no máximo 20 caracteres")]
    public string Brinco { get; set; } = string.Empty;

    [MaxLength(100, ErrorMessage = "Nome pode ter no máximo 100 caracteres")]
    public string? Nome { get; set; }

    [Required(ErrorMessage = "Raça é obrigatória")]
    [MaxLength(50, ErrorMessage = "Raça pode ter no máximo 50 caracteres")]
    public string Raca { get; set; } = string.Empty;

    [MaxLength(50, ErrorMessage = "Segunda raça pode ter no máximo 50 caracteres")]
    public string? Raca2 { get; set; }

    [Required(ErrorMessage = "Sexo é obrigatório")]
    [RegularExpression("^[MF]$", ErrorMessage = "Sexo deve ser 'M' ou 'F'")]
    public string Sexo { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tipo é obrigatório")]
    [MaxLength(50, ErrorMessage = "Tipo pode ter no máximo 50 caracteres")]
    public string Tipo { get; set; } = string.Empty;

    [MaxLength(30, ErrorMessage = "Status do leite pode ter no máximo 30 caracteres")]
    public string? StatusLeite { get; set; }

    [MaxLength(30, ErrorMessage = "Número do animal pode ter no máximo 30 caracteres")]
    public string? NumeroAnimal { get; set; }

    public DateTime? DataNascimento { get; set; }
    public string? DataNascimentoInformada { get; set; }
    public int? PaiAnimalId { get; set; }

    [MaxLength(100, ErrorMessage = "Nome do pai pode ter no máximo 100 caracteres")]
    public string? NomePai { get; set; }

    [MaxLength(50, ErrorMessage = "Raça do pai pode ter no máximo 50 caracteres")]
    public string? RacaPai { get; set; }
    public int? MaeAnimalId { get; set; }

    [MaxLength(100, ErrorMessage = "Nome da mãe pode ter no máximo 100 caracteres")]
    public string? NomeMae { get; set; }

    [MaxLength(50, ErrorMessage = "Raça da mãe pode ter no máximo 50 caracteres")]
    public string? RacaMae { get; set; }

    [MaxLength(120, ErrorMessage = "Procedência pode ter no máximo 120 caracteres")]
    public string? Procedencia { get; set; }

    public DateTime? DataEntrada { get; set; }
    public string? DataEntradaInformada { get; set; }

    public DateTime? DataSaida { get; set; }
    public string? DataSaidaInformada { get; set; }

    public decimal? Valor { get; set; }

    [MaxLength(120, ErrorMessage = "Motivo da saída pode ter no máximo 120 caracteres")]
    public string? MotivoSaida { get; set; }

    [MaxLength(120, ErrorMessage = "Marca ou sinal pode ter no máximo 120 caracteres")]
    public string? MarcaSinal { get; set; }

    [MaxLength(500, ErrorMessage = "Observação pode ter no máximo 500 caracteres")]
    public string? Observacao { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "ID da propriedade inválido")]
    public int PropriedadeId { get; set; }

    [MaxLength(3, ErrorMessage = "Cada animal pode ter no máximo 3 fotos")]
    public List<CadastrarAnimalFotoDto> Fotos { get; set; } = new();
}

public class CadastrarAnimalFotoDto
{
    [Required(ErrorMessage = "Foto é obrigatória")]
    public string FotoBase64 { get; set; } = string.Empty;

    [Range(1, 3, ErrorMessage = "Ordem da foto deve estar entre 1 e 3")]
    public int Ordem { get; set; }
}

public class AnimalResponseDto
{
    public int Id { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public string Raca { get; set; } = string.Empty;
    public string? Raca2 { get; set; }
    public string Sexo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string StatusLeite { get; set; } = string.Empty;
    public bool Ativo { get; set; }
    public string? NumeroAnimal { get; set; }
    public DateTime? DataNascimento { get; set; }
    public string? DataNascimentoInformada { get; set; }
    public int? PaiAnimalId { get; set; }
    public string? NomePai { get; set; }
    public string? RacaPai { get; set; }
    public int? MaeAnimalId { get; set; }
    public string? NomeMae { get; set; }
    public string? RacaMae { get; set; }
    public string? Procedencia { get; set; }
    public DateTime? DataEntrada { get; set; }
    public string? DataEntradaInformada { get; set; }
    public DateTime? DataSaida { get; set; }
    public string? DataSaidaInformada { get; set; }
    public decimal? Valor { get; set; }
    public string? MotivoSaida { get; set; }
    public string? MarcaSinal { get; set; }
    public string? Observacao { get; set; }
    public List<AnimalFotoDto> Fotos { get; set; } = new();
}

public class AnimalFotoDto
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string FotoBase64 { get; set; } = string.Empty;
    public int Ordem { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AnimalFiliacaoBuscaDto
{
    public int Id { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? NumeroAnimal { get; set; }
    public string? Nome { get; set; }
    public string Raca { get; set; } = string.Empty;
    public string Sexo { get; set; } = string.Empty;
}
