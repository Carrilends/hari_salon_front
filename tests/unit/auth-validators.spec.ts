import {
  hasNumber,
  hasUppercase,
  isEmail,
  isRequired,
  matches,
  minLength,
  minTrimmedLength,
} from 'src/helpers/validators';

describe('auth validators (NF05 — frontend)', () => {
  it('Caso 1: isEmail acepta correos válidos y rechaza inválidos', () => {
    const rule = isEmail();
    expect(rule('user@dom.com')).toBe(true);
    expect(rule('user@@dom')).toBe('Debe ser un correo válido');
    expect(rule('plain-text')).toBe('Debe ser un correo válido');
  });

  it('Caso 2: minLength(8) rechaza valores cortos', () => {
    const rule = minLength(8);
    expect(rule('Abc1!')).toBe('Debe tener al menos 8 caracteres');
    expect(rule('Abcdef12')).toBe(true);
  });

  it('Caso 3: hasUppercase y hasNumber rechazan passwords débiles', () => {
    expect(hasUppercase()('abcdef12!')).toBe('Debe tener al menos una mayúscula');
    expect(hasUppercase()('Abcdef12!')).toBe(true);
    expect(hasNumber()('Abcdefgh!')).toBe('Debe tener al menos un número');
    expect(hasNumber()('Abcdefg1!')).toBe(true);
  });

  it('Caso 4: matches() compara contra el valor actual del password', () => {
    let password = 'Str0ng!pass';
    const rule = matches(() => password);
    expect(rule('otra-cosa')).toBe('Las contraseñas no coinciden');
    expect(rule(password)).toBe(true);
    password = 'cambiada';
    expect(rule('cambiada')).toBe(true);
  });

  it('Caso 5: minTrimmedLength(3) rechaza espacios y acepta nombres válidos', () => {
    const rule = minTrimmedLength(3);
    expect(rule('  a ')).toBe('Debe tener al menos 3 caracteres');
    expect(rule('Ana')).toBe(true);
    expect(rule('   Carlos   ')).toBe(true);
  });

  it('Caso 6: isRequired marca vacíos, null y undefined', () => {
    expect(isRequired('')).toBe('Requerido');
    expect(isRequired(null)).toBe('Requerido');
    expect(isRequired(undefined)).toBe('Requerido');
    expect(isRequired('hola')).toBe(true);
  });
});
