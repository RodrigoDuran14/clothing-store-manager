const validatePostUser = (req, res, next) => {
  const { name, email, phone, password, admin, active } = req.body;
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    errors.push("El nombre es obligatorio y debe tener al menos 3 caracteres.");
  }
  if (name && name.trim().length > 25) {
    errors.push("El nombre no puede superar los 25 caracteres.");
  }

  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    errors.push("El email es obligatorio y debe tener un formato válido.");
  }

  if (phone) {
    if (typeof phone !== "string") {
      errors.push("El teléfono debe ser un string.");
    } else if (phone.trim().length < 6) {
      errors.push("El número de teléfono debe tener al menos 6 caracteres.");
    } else if (phone.trim().length > 20) {
      errors.push("El número de teléfono no puede superar los 20 caracteres.");
    }
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push(
      "La contraseña es obligatoria y debe tener al menos 6 caracteres."
    );
  }

  if (admin != null && typeof admin !== "boolean") {
    errors.push("El campo admin debe ser true o false.");
  }

  if (active != null && typeof active !== "boolean") {
    errors.push("El campo active debe ser true o false.");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = { validatePostUser };
