export interface Option<T extends string | number = number> {
    id: T
    label: string
}