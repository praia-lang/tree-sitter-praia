// Tree-sitter grammar for Praia (https://praia.sh)

const PREC = {
  ASSIGN: 1,
  OR: 2,
  AND: 3,
  BIT_OR: 4,
  BIT_XOR: 5,
  BIT_AND: 6,
  EQUAL: 7,
  COMPARE: 8,
  SHIFT: 9,
  ADD: 10,
  MULT: 11,
  UNARY: 12,
  POSTFIX: 13,
  CALL: 14,
  MEMBER: 15,
  PIPE: 3,
};

module.exports = grammar({
  name: 'praia',

  extras: $ => [/\s/, $.line_comment, $.block_comment],

  word: $ => $.identifier,

  conflicts: $ => [
    [$._statement, $._expression],
  ],

  rules: {
    source_file: $ => repeat($._statement),

    // ── Statements ──

    _statement: $ => choice(
      $.variable_declaration,
      $.function_declaration,
      $.class_declaration,
      $.enum_declaration,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.match_statement,
      $.try_statement,
      $.ensure_statement,
      $.defer_statement,
      $.return_statement,
      $.yield_expression,
      $.throw_statement,
      $.break_statement,
      $.continue_statement,
      $.use_statement,
      $.export_statement,
      $.expression_statement,
    ),

    expression_statement: $ => seq($._expression, optional(';')),

    block: $ => seq('{', repeat($._statement), '}'),

    // ── Declarations ──

    variable_declaration: $ => seq(
      'let',
      choice(
        $.identifier,
        $.array_destructuring,
        $.map_destructuring,
      ),
      optional(seq('=', $._expression)),
      optional(';'),
    ),

    array_destructuring: $ => seq(
      '[',
      commaSep(choice($.identifier, $.spread_element)),
      ']',
    ),

    map_destructuring: $ => seq(
      '{',
      commaSep(choice(
        $.identifier,
        seq($.identifier, ':', $.identifier),
        $.spread_element,
      )),
      '}',
    ),

    function_declaration: $ => seq(
      optional($.decorator),
      optional('static'),
      'func',
      field('name', $.identifier),
      $.parameter_list,
      $.block,
    ),

    parameter_list: $ => seq(
      '(',
      commaSep(choice(
        $.parameter,
        $.spread_parameter,
      )),
      ')',
    ),

    parameter: $ => prec(1, seq(
      field('name', $.identifier),
      optional(seq('=', $._expression)),
    )),

    spread_parameter: $ => seq('...', $.identifier),

    class_declaration: $ => seq(
      'class',
      field('name', $.identifier),
      optional(seq('extends', field('superclass', $.identifier))),
      $.class_body,
    ),

    class_body: $ => seq('{', repeat($.function_declaration), '}'),

    enum_declaration: $ => seq(
      'enum',
      field('name', $.identifier),
      '{',
      commaSep($.enum_member),
      '}',
    ),

    enum_member: $ => seq(
      $.identifier,
      optional(seq('=', $._expression)),
    ),

    decorator: $ => seq('@', $._expression),

    // ── Control flow ──

    if_statement: $ => seq(
      'if',
      $.parenthesized_expression,
      $.block,
      repeat($.elif_clause),
      optional($.else_clause),
    ),

    elif_clause: $ => seq('elif', $.parenthesized_expression, $.block),
    else_clause: $ => seq('else', $.block),

    for_statement: $ => seq(
      'for',
      '(',
      choice(
        seq($.identifier, 'in', $._expression),
        seq($.map_destructuring, 'in', $._expression),
        seq($.array_destructuring, 'in', $._expression),
      ),
      ')',
      $.block,
    ),

    while_statement: $ => seq('while', $.parenthesized_expression, $.block),

    match_statement: $ => seq(
      'match',
      $.parenthesized_expression,
      '{',
      repeat($.match_case),
      '}',
    ),

    match_case: $ => choice(
      seq('is', $._expression, $.block),
      seq('when', $._expression, $.block),
      seq($._expression, $.block),
      seq('_', $.block),
      // Tagged pattern: Ok(val) { ... }
      prec(1, seq($.identifier, '(', commaSep($.identifier), ')', $.block)),
    ),

    try_statement: $ => seq(
      'try',
      $.block,
      optional(seq('catch', '(', $.identifier, ')', $.block)),
      optional(seq('finally', $.block)),
    ),

    ensure_statement: $ => seq(
      'ensure',
      $.parenthesized_expression,
      'else',
      $.block,
    ),

    defer_statement: $ => seq('defer', $._expression, optional(';')),

    return_statement: $ => prec.right(seq('return', optional($._expression), optional(';'))),
    throw_statement: $ => prec.right(seq('throw', $._expression, optional(';'))),
    break_statement: $ => seq('break', optional(';')),
    continue_statement: $ => seq('continue', optional(';')),

    yield_expression: $ => prec.right(seq('yield', optional($._expression))),

    // ── Modules ──

    use_statement: $ => seq(
      'use',
      $.string,
      optional(seq('as', $.identifier)),
      optional(';'),
    ),

    export_statement: $ => seq(
      'export',
      '{',
      commaSep($.identifier),
      '}',
      optional(';'),
    ),

    // ── Expressions ──

    _expression: $ => choice(
      $.primary_expression,
      $.unary_expression,
      $.binary_expression,
      $.ternary_expression,
      $.assignment_expression,
      $.update_expression,
      $.lambda_expression,
      $.pipe_expression,
      $.yield_expression,
      seq('async', $._expression),
      seq('await', $._expression),
    ),

    primary_expression: $ => choice(
      $.identifier,
      $.number,
      $.string,
      $.triple_string,
      $.true,
      $.false,
      $.nil,
      $.this,
      $.super,
      $.array_literal,
      $.map_literal,
      $.set_literal,
      $.parenthesized_expression,
      $.call_expression,
      $.member_expression,
      $.index_expression,
      $.spread_element,
    ),

    lhs_expression: $ => choice(
      $.identifier,
      $.member_expression,
      $.index_expression,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    call_expression: $ => prec(PREC.CALL, seq(
      $._expression,
      '(',
      commaSep(choice(
        $._expression,
        $.named_argument,
      )),
      ')',
    )),

    named_argument: $ => seq($.identifier, ':', $._expression),

    member_expression: $ => prec(PREC.MEMBER, seq(
      $._expression,
      choice('.', '?.'),
      $.identifier,
    )),

    index_expression: $ => prec(PREC.MEMBER, seq(
      $._expression,
      choice('[', '?['),
      $._expression,
      ']',
    )),

    unary_expression: $ => prec(PREC.UNARY, choice(
      seq('-', $._expression),
      seq('!', $._expression),
      seq('~', $._expression),
    )),

    binary_expression: $ => choice(
      ...[
        ['+', PREC.ADD], ['-', PREC.ADD],
        ['*', PREC.MULT], ['/', PREC.MULT], ['%', PREC.MULT],
        ['==', PREC.EQUAL], ['!=', PREC.EQUAL],
        ['<', PREC.COMPARE], ['<=', PREC.COMPARE],
        ['>', PREC.COMPARE], ['>=', PREC.COMPARE],
        ['&&', PREC.AND], ['||', PREC.OR],
        ['??', PREC.OR],
        ['&', PREC.BIT_AND], ['|', PREC.BIT_OR], ['^', PREC.BIT_XOR],
        ['<<', PREC.SHIFT], ['>>', PREC.SHIFT],
        ['is', PREC.COMPARE],
        ['..', PREC.COMPARE],
      ].map(([op, prec_val]) =>
        prec.left(prec_val, seq($._expression, op, $._expression))
      ),
    ),

    ternary_expression: $ => prec.right(PREC.ASSIGN, seq(
      $._expression, '?', $._expression, ':', $._expression,
    )),

    assignment_expression: $ => prec.right(PREC.ASSIGN, seq(
      $.lhs_expression,
      choice('=', '+=', '-=', '*=', '/=', '%='),
      $._expression,
    )),

    update_expression: $ => prec(PREC.POSTFIX, choice(
      seq($._expression, '++'),
      seq($._expression, '--'),
    )),

    pipe_expression: $ => prec.left(PREC.PIPE, seq(
      $._expression,
      choice('|>', '|?>'),
      $._expression,
    )),

    lambda_expression: $ => prec(1, seq(
      'lam',
      '{',
      optional(seq(
        commaSep(choice($.parameter, $.spread_parameter)),
        'in',
      )),
      repeat($._statement),
      optional($._expression),
      '}',
    )),

    spread_element: $ => seq('...', $._expression),

    // ── Literals ──

    array_literal: $ => seq('[', commaSep($._expression), ']'),

    map_literal: $ => seq(
      '{',
      commaSep(choice(
        $.pair,
        $.computed_pair,
        $.spread_element,
      )),
      '}',
    ),

    // Set literal: #{1, 2, 3}. The opener is the two-character
    // sequence `#{` (a single token in the Praia lexer); the closer
    // is just `}`. Empty set is `#{}`. Elements are arbitrary
    // expressions; spread already routes through primary_expression
    // → spread_element, so we don't enumerate it separately (doing
    // so creates an ambiguity since both paths can produce the same
    // node).
    set_literal: $ => seq(
      '#{',
      commaSep($._expression),
      '}',
    ),

    pair: $ => seq(
      field('key', choice($.identifier, $.string, $.number)),
      ':',
      field('value', $._expression),
    ),

    computed_pair: $ => seq(
      '[', field('key', $._expression), ']',
      ':',
      field('value', $._expression),
    ),

    // ── Tokens ──

    identifier: $ => /[a-zA-Z_]\w*/,

    number: $ => choice(
      /0[xX][0-9a-fA-F][0-9a-fA-F_]*/,    // hex
      /0[bB][01][01_]*/,                     // binary
      /0[oO][0-7][0-7_]*/,                  // octal
      /\d[\d_]*\.[\d][\d_]*([eE][+-]?\d[\d_]*)?/,  // float
      /\d[\d_]*[eE][+-]?\d[\d_]*/,          // scientific
      /\d[\d_]*/,                            // integer
    ),

    string: $ => choice(
      seq('"', repeat(choice($.escape_sequence, $.interpolation, /[^"\\%]+/, '%')), '"'),
      seq("'", repeat(choice($.escape_sequence, /[^'\\]+/)), "'"),
    ),

    triple_string: $ => seq(
      '"""',
      repeat(choice($.escape_sequence, $.interpolation, /[^"\\%]+/, /"+/, '%')),
      '"""',
    ),

    escape_sequence: $ => /\\([ntr0\\\"'\/%]|x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]+\})/,

    interpolation: $ => seq('%{', $._expression, '}'),

    true: $ => 'true',
    false: $ => 'false',
    nil: $ => 'nil',
    this: $ => 'this',
    super: $ => 'super',

    // ── Comments ──

    line_comment: $ => /\/\/[^\n]*/,

    block_comment: $ => seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
  },
});

function commaSep(rule) {
  return optional(seq(rule, repeat(seq(',', rule)), optional(',')));
}
