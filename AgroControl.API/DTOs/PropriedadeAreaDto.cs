using System.ComponentModel.DataAnnotations;

namespace AgroControl.API.DTOs;

public class CadastrarPropriedadeAreaDto
{
    [Range(1, int.MaxValue, ErrorMessage = "ID da propriedade invalido")]
    public int PropriedadeId { get; set; }

    [MaxLength(20, ErrorMessage = "Tipo de cadastro pode ter no maximo 20 caracteres")]
    public string TipoCadastro { get; set; } = "AREA_INTERNA";

    public int? AreaPaiId { get; set; }

    [Required(ErrorMessage = "Nome da area e obrigatorio")]
    [MaxLength(100, ErrorMessage = "Nome da area pode ter no maximo 100 caracteres")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tipo da area e obrigatorio")]
    [MaxLength(50, ErrorMessage = "Tipo da area pode ter no maximo 50 caracteres")]
    public string TipoArea { get; set; } = string.Empty;

    [MaxLength(7, ErrorMessage = "Cor pode ter no maximo 7 caracteres")]
    public string? Cor { get; set; }

    [MaxLength(500, ErrorMessage = "Observacao pode ter no maximo 500 caracteres")]
    public string? Observacao { get; set; }

    [Required(ErrorMessage = "Coordenadas da area sao obrigatorias")]
    public string CoordenadasGeojson { get; set; } = string.Empty;

    public decimal? AreaHectares { get; set; }
}

public class PropriedadeAreaResponseDto
{
    public int Id { get; set; }
    public int PropriedadeId { get; set; }
    public string TipoCadastro { get; set; } = string.Empty;
    public int? AreaPaiId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string TipoArea { get; set; } = string.Empty;
    public string? Cor { get; set; }
    public string? Observacao { get; set; }
    public string CoordenadasGeojson { get; set; } = string.Empty;
    public decimal? AreaHectares { get; set; }
    public DateTime CreatedAt { get; set; }
}
