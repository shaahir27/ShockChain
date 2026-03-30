#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_NODES 10
#define NAME_LEN 50

typedef struct {
    char name[NAME_LEN];
    float supply;
} Node;

Node nodes[MAX_NODES] = {
    {"Taiwan_Chips", 100},
    {"Ukraine_Grain", 100},
    {"Saudi_Oil", 100},
    {"Germany_Auto", 100},
    {"Brazil_Iron", 100},
    {"Australia_Lithium", 100},
    {"USA_Tech", 100}
};

// Edge weights represent dependency (0.0 to 1.0)
float dependencies[MAX_NODES][MAX_NODES] = {0};

void init_dependencies() {
    // Germany Auto depends heavily on Taiwan Chips (0.8) and Brazil Iron (0.4)
    dependencies[0][3] = 0.8; 
    dependencies[4][3] = 0.4;
    // USA Tech depends on Taiwan Chips (0.7) and Australia Lithium (0.5)
    dependencies[0][6] = 0.7;
    dependencies[5][6] = 0.5;
}

int main() {
    char country[NAME_LEN], resource[NAME_LEN], shock[NAME_LEN];
    float reduction;

    if(scanf("%s %s %s %f", country, resource, shock, &reduction) != 4) return 1;

    init_dependencies();
    
    char target[NAME_LEN * 2];
    sprintf(target, "%s_%s", country, resource);

    int source_idx = -1;
    for(int i=0; i<7; i++) if(strcmp(nodes[i].name, target) == 0) source_idx = i;

    if(source_idx == -1) return 1;

    float current_reduction[MAX_NODES] = {0};
    current_reduction[source_idx] = reduction;

    // Simulate propagation: If a resource fails, its dependents lose supply based on weight
    for(int i=0; i<7; i++) {
        if(dependencies[source_idx][i] > 0) {
            current_reduction[i] = reduction * dependencies[source_idx][i];
        }
    }

    // Output results
    for(int i=0; i<7; i++) {
        float final = nodes[i].supply - current_reduction[i];
        printf("%s:%.0f", nodes[i].name, final < 0 ? 0 : final);
        if(i < 6) printf(";");
    }

    return 0;
}