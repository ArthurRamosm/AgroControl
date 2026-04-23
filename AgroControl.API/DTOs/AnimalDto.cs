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

    [Required(ErrorMessage = "Sexo é obrigatório")]
    [RegularExpression("^[MF]$", ErrorMessage = "Sexo deve ser 'M' ou 'F'")]
    public string Sexo { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tipo é obrigatório")]
    [MaxLength(50, ErrorMessage = "Tipo pode ter no máximo 50 caracteres")]
    public string Tipo { get; set; } = string.Empty;

    [MaxLength(30, ErrorMessage = "Status do leite pode ter no máximo 30 caracteres")]
    public string StatusLeite { get; set; } = "N/A";

    [Range(1, int.MaxValue, ErrorMessage = "ID da propriedade inválido")]
    public int PropriedadeId { get; set; }
}

public class AnimalResponseDto
{
    public int Id { get; set; }
    public string Brinco { get; set; } = string.Empty;
    public string? Nome { get; set; }
    public string Raca { get; set; } = string.Empty;
    public string Sexo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string StatusLeite { get; set; } = string.Empty;
    public bool Ativo { get; set; }
}
