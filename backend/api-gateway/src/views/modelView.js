/** Public representation of a model: whitelists fields coming from the internal AI service. */
export function toModelView(model) {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    kind: model.kind,
    task: model.task ?? 'super_resolution',
    version: model.version ?? null,
    weightsFile: model.weightsFile ?? null,
    source: model.source ?? null,
    scales: model.scales,
    available: Boolean(model.available),
    unavailableReason: model.available ? null : model.unavailableReason ?? 'Unavailable',
  };
}
