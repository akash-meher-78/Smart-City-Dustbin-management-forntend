export const getColor = (fill) => {
    if (fill >= 80) return "red";
    if (fill >= 50) return "yellow";
    return "green";
};