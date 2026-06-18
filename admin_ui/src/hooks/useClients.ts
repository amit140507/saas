import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientFormData } from "../lib/validations/schemas";
import { createClient, getClients } from "@/services/client.service";

export const useClients = () => {
  return useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newClient: ClientFormData) => {
      return createClient({
        user: {
          first_name: newClient.first_name,
          last_name: newClient.last_name,
          email: newClient.email,
        },
        phone: newClient.phone ?? "",
        status: newClient.status,
        goal: newClient.goal ?? "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
};
