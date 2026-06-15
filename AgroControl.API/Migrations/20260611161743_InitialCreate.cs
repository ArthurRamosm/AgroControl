using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgroControl.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PROPRIEDADE",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    cidade = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    estado = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: true),
                    foco_produtivo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "ambos")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PROPRIEDADE", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ANIMAL",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    brinco = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    raca = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    raca2 = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    sexo = table.Column<string>(type: "nvarchar(1)", maxLength: 1, nullable: false),
                    tipo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    status_leite = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ativo = table.Column<bool>(type: "bit", nullable: false),
                    numero_animal = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    data_nascimento = table.Column<DateTime>(type: "datetime2", nullable: true),
                    data_nascimento_informada = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    pai_animal_id = table.Column<int>(type: "int", nullable: true),
                    nome_pai = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    raca_pai = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    mae_animal_id = table.Column<int>(type: "int", nullable: true),
                    nome_mae = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    raca_mae = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    procedencia = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    data_entrada = table.Column<DateTime>(type: "datetime2", nullable: true),
                    data_entrada_informada = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    data_saida = table.Column<DateTime>(type: "datetime2", nullable: true),
                    data_saida_informada = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    valor = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    motivo_saida = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    marca_sinal = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    propriedade_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ANIMAL", x => x.id);
                    table.ForeignKey(
                        name: "FK_ANIMAL_ANIMAL_mae_animal_id",
                        column: x => x.mae_animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ANIMAL_ANIMAL_pai_animal_id",
                        column: x => x.pai_animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ANIMAL_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ESTOQUE_MEDICAMENTO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    propriedade_id = table.Column<int>(type: "int", nullable: false),
                    nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    tipo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    unidade = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    quantidade_atual = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    quantidade_minima = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    valor_unitario = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ESTOQUE_MEDICAMENTO", x => x.id);
                    table.ForeignKey(
                        name: "FK_ESTOQUE_MEDICAMENTO_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PROPRIEDADE_AREA",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    propriedade_id = table.Column<int>(type: "int", nullable: false),
                    tipo_cadastro = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "AREA_INTERNA"),
                    area_pai_id = table.Column<int>(type: "int", nullable: true),
                    nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    tipo_area = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    cor = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    coordenadas_geojson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    area_hectares = table.Column<decimal>(type: "decimal(12,4)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PROPRIEDADE_AREA", x => x.id);
                    table.ForeignKey(
                        name: "FK_PROPRIEDADE_AREA_PROPRIEDADE_AREA_area_pai_id",
                        column: x => x.area_pai_id,
                        principalTable: "PROPRIEDADE_AREA",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PROPRIEDADE_AREA_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PROPRIEDADE_PONTO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    propriedade_id = table.Column<int>(type: "int", nullable: false),
                    tipo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    latitude = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    longitude = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PROPRIEDADE_PONTO", x => x.id);
                    table.ForeignKey(
                        name: "FK_PROPRIEDADE_PONTO_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RECEITA",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    propriedade_id = table.Column<int>(type: "int", nullable: false),
                    tipo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Outros"),
                    descricao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    valor = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    data_receita = table.Column<DateTime>(type: "datetime2", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RECEITA", x => x.id);
                    table.ForeignKey(
                        name: "FK_RECEITA_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "USUARIO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    usuario = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    senha = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    propriedade_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USUARIO", x => x.id);
                    table.ForeignKey(
                        name: "FK_USUARIO_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AFASTAMENTO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    animal_id = table.Column<int>(type: "int", nullable: false),
                    propriedade_id = table.Column<int>(type: "int", nullable: false),
                    motivo_afastamento = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    data_afastamento = table.Column<DateTime>(type: "datetime2", nullable: false),
                    produto_utilizado = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    periodo_carencia = table.Column<int>(type: "int", nullable: true),
                    data_retorno = table.Column<DateTime>(type: "datetime2", nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AFASTAMENTO", x => x.id);
                    table.ForeignKey(
                        name: "FK_AFASTAMENTO_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AFASTAMENTO_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ALERTA",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    propriedade_id = table.Column<int>(type: "int", nullable: false),
                    animal_id = table.Column<int>(type: "int", nullable: true),
                    tipo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    descricao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    data_alerta = table.Column<DateTime>(type: "datetime2", nullable: false),
                    lido = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ALERTA", x => x.id);
                    table.ForeignKey(
                        name: "FK_ALERTA_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ALERTA_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ANIMAL_EVENTO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    animal_id = table.Column<int>(type: "int", nullable: false),
                    tipo_evento = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    data_evento = table.Column<DateTime>(type: "datetime2", nullable: false),
                    peso_kg = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    racao_kg_dia = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    leite_litros_dia = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ANIMAL_EVENTO", x => x.id);
                    table.ForeignKey(
                        name: "FK_ANIMAL_EVENTO_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ANIMAL_FOTO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    animal_id = table.Column<int>(type: "int", nullable: false),
                    foto_base64 = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ordem = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ANIMAL_FOTO", x => x.id);
                    table.CheckConstraint("CK_ANIMAL_FOTO_ORDEM", "ordem BETWEEN 1 AND 3");
                    table.ForeignKey(
                        name: "FK_ANIMAL_FOTO_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ANIMAL_LACTACAO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    animal_id = table.Column<int>(type: "int", nullable: false),
                    numero_lactacao = table.Column<int>(type: "int", nullable: false),
                    data_parto = table.Column<DateTime>(type: "datetime2", nullable: true),
                    inicio_controle = table.Column<DateTime>(type: "datetime2", nullable: true),
                    data_secagem = table.Column<DateTime>(type: "datetime2", nullable: true),
                    dias_lactacao = table.Column<int>(type: "int", nullable: true),
                    producao_total = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    media_diaria = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ANIMAL_LACTACAO", x => x.id);
                    table.ForeignKey(
                        name: "FK_ANIMAL_LACTACAO_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ANIMAL_REPRODUCAO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    animal_id = table.Column<int>(type: "int", nullable: false),
                    tipo_evento = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    data_evento = table.Column<DateTime>(type: "datetime2", nullable: false),
                    reprodutor = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    inseminador = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    previsao_parto = table.Column<DateTime>(type: "datetime2", nullable: true),
                    resultado = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ANIMAL_REPRODUCAO", x => x.id);
                    table.ForeignKey(
                        name: "FK_ANIMAL_REPRODUCAO_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ANIMAL_SAUDE_REGISTRO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    animal_id = table.Column<int>(type: "int", nullable: false),
                    tipo_registro = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    data_registro = table.Column<DateTime>(type: "datetime2", nullable: false),
                    descricao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    produto_utilizado = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    dose = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    veterinario = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    proxima_aplicacao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ANIMAL_SAUDE_REGISTRO", x => x.id);
                    table.ForeignKey(
                        name: "FK_ANIMAL_SAUDE_REGISTRO_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ANIMAL_VACINA",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    animal_id = table.Column<int>(type: "int", nullable: false),
                    nome_vacina = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    data_aplicacao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    dose = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    proxima_aplicacao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ANIMAL_VACINA", x => x.id);
                    table.ForeignKey(
                        name: "FK_ANIMAL_VACINA_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DESPESA",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    propriedade_id = table.Column<int>(type: "int", nullable: false),
                    animal_id = table.Column<int>(type: "int", nullable: true),
                    categoria = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    descricao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    valor = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    data_despesa = table.Column<DateTime>(type: "datetime2", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DESPESA", x => x.id);
                    table.ForeignKey(
                        name: "FK_DESPESA_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_DESPESA_PROPRIEDADE_propriedade_id",
                        column: x => x.propriedade_id,
                        principalTable: "PROPRIEDADE",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ESTOQUE_MOVIMENTACAO",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    estoque_id = table.Column<int>(type: "int", nullable: false),
                    tipo_movimentacao = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    quantidade = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    motivo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    animal_id = table.Column<int>(type: "int", nullable: true),
                    data_movimentacao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    observacao = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ESTOQUE_MOVIMENTACAO", x => x.id);
                    table.ForeignKey(
                        name: "FK_ESTOQUE_MOVIMENTACAO_ANIMAL_animal_id",
                        column: x => x.animal_id,
                        principalTable: "ANIMAL",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_ESTOQUE_MOVIMENTACAO_ESTOQUE_MEDICAMENTO_estoque_id",
                        column: x => x.estoque_id,
                        principalTable: "ESTOQUE_MEDICAMENTO",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AFASTAMENTO_animal_id",
                table: "AFASTAMENTO",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_AFASTAMENTO_propriedade_id",
                table: "AFASTAMENTO",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_ALERTA_animal_id",
                table: "ALERTA",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ALERTA_propriedade_id",
                table: "ALERTA",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_mae_animal_id",
                table: "ANIMAL",
                column: "mae_animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_pai_animal_id",
                table: "ANIMAL",
                column: "pai_animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_propriedade_id",
                table: "ANIMAL",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_EVENTO_animal_id",
                table: "ANIMAL_EVENTO",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_FOTO_animal_id_ordem",
                table: "ANIMAL_FOTO",
                columns: new[] { "animal_id", "ordem" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_LACTACAO_animal_id",
                table: "ANIMAL_LACTACAO",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_REPRODUCAO_animal_id",
                table: "ANIMAL_REPRODUCAO",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_SAUDE_REGISTRO_animal_id",
                table: "ANIMAL_SAUDE_REGISTRO",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ANIMAL_VACINA_animal_id",
                table: "ANIMAL_VACINA",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_DESPESA_animal_id",
                table: "DESPESA",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_DESPESA_propriedade_id",
                table: "DESPESA",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_ESTOQUE_MEDICAMENTO_propriedade_id",
                table: "ESTOQUE_MEDICAMENTO",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_ESTOQUE_MOVIMENTACAO_animal_id",
                table: "ESTOQUE_MOVIMENTACAO",
                column: "animal_id");

            migrationBuilder.CreateIndex(
                name: "IX_ESTOQUE_MOVIMENTACAO_estoque_id",
                table: "ESTOQUE_MOVIMENTACAO",
                column: "estoque_id");

            migrationBuilder.CreateIndex(
                name: "IX_PROPRIEDADE_AREA_area_pai_id",
                table: "PROPRIEDADE_AREA",
                column: "area_pai_id");

            migrationBuilder.CreateIndex(
                name: "IX_PROPRIEDADE_AREA_propriedade_id",
                table: "PROPRIEDADE_AREA",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_PROPRIEDADE_PONTO_propriedade_id",
                table: "PROPRIEDADE_PONTO",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_RECEITA_propriedade_id",
                table: "RECEITA",
                column: "propriedade_id");

            migrationBuilder.CreateIndex(
                name: "IX_USUARIO_propriedade_id",
                table: "USUARIO",
                column: "propriedade_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AFASTAMENTO");

            migrationBuilder.DropTable(
                name: "ALERTA");

            migrationBuilder.DropTable(
                name: "ANIMAL_EVENTO");

            migrationBuilder.DropTable(
                name: "ANIMAL_FOTO");

            migrationBuilder.DropTable(
                name: "ANIMAL_LACTACAO");

            migrationBuilder.DropTable(
                name: "ANIMAL_REPRODUCAO");

            migrationBuilder.DropTable(
                name: "ANIMAL_SAUDE_REGISTRO");

            migrationBuilder.DropTable(
                name: "ANIMAL_VACINA");

            migrationBuilder.DropTable(
                name: "DESPESA");

            migrationBuilder.DropTable(
                name: "ESTOQUE_MOVIMENTACAO");

            migrationBuilder.DropTable(
                name: "PROPRIEDADE_AREA");

            migrationBuilder.DropTable(
                name: "PROPRIEDADE_PONTO");

            migrationBuilder.DropTable(
                name: "RECEITA");

            migrationBuilder.DropTable(
                name: "USUARIO");

            migrationBuilder.DropTable(
                name: "ANIMAL");

            migrationBuilder.DropTable(
                name: "ESTOQUE_MEDICAMENTO");

            migrationBuilder.DropTable(
                name: "PROPRIEDADE");
        }
    }
}
