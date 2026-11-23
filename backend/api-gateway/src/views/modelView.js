/** Public representation of a model: whitelists fields coming from the internal AI service. */
export function toModelView(model) {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    kind: model.kind,
    scales: model.scales,
    available: Boolean(model.available),
    unavailableReason: model.available ? null : model.unavailableReason ?? 'Unavailable',
  };
}
